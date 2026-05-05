"use client";

import { useMemo, useRef, useState } from "react";
import { LangProvider } from "../i18n/LangProvider";
import { ApiClient } from "../lib/api";
import type { ProfilePatch } from "../lib/types";
import { LoginScreen, NameIntro, SignUpScreen } from "./AuthScreens";
import { IntroPage } from "./IntroPage";
import { Onboarding } from "./Onboarding";
import { Workspace, type WorkspaceCompleteness, type WorkspaceProfile } from "./Workspace";

type AuthPayload = { email: string; username: string; password: string };
type LoginPayload = { email: string; password: string };
type AuthResult = { access_token: string; user: { id: string; email: string; username: string } };

export interface StageApi {
  register(payload: AuthPayload): Promise<AuthResult>;
  login(payload: LoginPayload): Promise<AuthResult>;
  patchProfile(payload: ProfilePatch): Promise<Partial<WorkspaceProfile>>;
  getProfile(): Promise<WorkspaceProfile>;
  getCompleteness(): Promise<WorkspaceCompleteness>;
  startConversation?(payload: { context_type: "career"; focus_node?: string | null }): Promise<unknown>;
  sendMessage?(payload: { conversation_id: string; content: string }): Promise<unknown>;
}

interface StageAppProps {
  api?: StageApi;
}

type Stage = "intro" | "login" | "signup" | "name" | "onboarding" | "workspace";
type SessionUser = { name: string; initials: string; email: string };

const TOKEN_KEY = "careerpal.accessToken";

export function StageApp({ api }: StageAppProps) {
  return (
    <LangProvider>
      <StageAppInner api={api} />
    </LangProvider>
  );
}

function StageAppInner({ api }: StageAppProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [completeness, setCompleteness] = useState<WorkspaceCompleteness | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const isLoadingWorkspaceRef = useRef(false);
  const workspaceRequestIdRef = useRef(0);

  const client = useMemo<StageApi>(() => api ?? createBrowserApi(readStoredToken), [api]);

  async function handleAuth(action: "register" | "login", payload: AuthPayload | LoginPayload) {
    const result =
      action === "register" ? await client.register(payload as AuthPayload) : await client.login(payload as LoginPayload);
    storeToken(result.access_token);
    setPendingEmail(result.user.email);
    if (action === "register") {
      setStage("name");
      return;
    }

    await loadWorkspace();
  }

  async function handleName(name: string) {
    await client.patchProfile({ name });
    setSessionUser({ name, initials: initialsForName(name), email: pendingEmail });
    setStage("onboarding");
  }

  async function loadWorkspace() {
    if (isLoadingWorkspaceRef.current) {
      return;
    }

    isLoadingWorkspaceRef.current = true;
    const requestId = workspaceRequestIdRef.current + 1;
    workspaceRequestIdRef.current = requestId;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);

    try {
      const [nextProfile, nextCompleteness] = await Promise.all([client.getProfile(), client.getCompleteness()]);
      if (workspaceRequestIdRef.current !== requestId) {
        return;
      }

      setProfile(nextProfile);
      setCompleteness(nextCompleteness);
      await client.startConversation?.({ context_type: "career", focus_node: null });
      if (workspaceRequestIdRef.current !== requestId) {
        return;
      }

      setStage("workspace");
    } catch (caught) {
      if (workspaceRequestIdRef.current === requestId) {
        setWorkspaceError(caught instanceof Error ? caught.message : "Could not load your workspace.");
      }
    } finally {
      if (workspaceRequestIdRef.current === requestId) {
        isLoadingWorkspaceRef.current = false;
        setIsLoadingWorkspace(false);
      }
    }
  }

  function handleLogout() {
    storeToken(null);
    setProfile(null);
    setCompleteness(null);
    setPendingEmail("");
    setSessionUser(null);
    setIsLoadingWorkspace(false);
    isLoadingWorkspaceRef.current = false;
    workspaceRequestIdRef.current += 1;
    setStage("intro");
  }

  if (stage === "intro") {
    return <IntroPage onGetStarted={() => setStage("signup")} onSignIn={() => setStage("login")} />;
  }

  if (stage === "login") {
    return (
      <LoginScreen
        onBack={() => setStage("intro")}
        onLogin={(payload) => handleAuth("login", payload)}
        onGoSignup={() => setStage("signup")}
      />
    );
  }

  if (stage === "signup") {
    return (
      <SignUpScreen
        onBack={() => setStage("intro")}
        onComplete={(payload) =>
          handleAuth("register", { email: payload.email, username: usernameFromEmail(payload.email), password: payload.password })
        }
        onGoLogin={() => setStage("login")}
      />
    );
  }

  if (stage === "name") {
    return <NameIntro onSubmit={handleName} />;
  }

  if (stage === "onboarding") {
    return (
      <>
        <Onboarding
          user={sessionUser ?? { name: "CareerPal user", initials: "CU", email: pendingEmail }}
          isLoading={isLoadingWorkspace}
          onDone={loadWorkspace}
        />
        {workspaceError ? <p className="floating-error">{workspaceError}</p> : null}
      </>
    );
  }

  if (!profile || !completeness) {
    return null;
  }

  return <Workspace profile={profile} completeness={completeness} onLogout={handleLogout} />;
}

export function defaultApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

function createBrowserApi(getToken: () => string | null): StageApi {
  const baseUrl = defaultApiBaseUrl();
  return new ApiClient(baseUrl, getToken);
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

function storeToken(nextToken: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (nextToken) {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function usernameFromEmail(email: string): string {
  const prefix = email.split("@")[0] || "user";
  return prefix.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "user";
}

function initialsForName(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "CU";
}
