"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { ApiClient } from "../lib/api";
import type { ProfilePatch } from "../lib/types";
import { AuthScreens } from "./AuthScreens";
import { IntroScreen } from "./IntroScreen";
import { OnboardingScreen } from "./OnboardingScreen";
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

type Stage = "intro" | "auth" | "name" | "onboarding" | "workspace";

const TOKEN_KEY = "careerpal.accessToken";

export function StageApp({ api }: StageAppProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [completeness, setCompleteness] = useState<WorkspaceCompleteness | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const isLoadingWorkspaceRef = useRef(false);
  const workspaceRequestIdRef = useRef(0);

  const client = useMemo<StageApi>(() => api ?? createBrowserApi(readStoredToken), [api]);

  async function handleAuth(action: "register" | "login", payload: AuthPayload | LoginPayload) {
    const result =
      action === "register" ? await client.register(payload as AuthPayload) : await client.login(payload as LoginPayload);
    storeToken(result.access_token);
    if (action === "register") {
      setStage("name");
      return;
    }

    await loadWorkspace();
  }

  async function handleName(name: string) {
    await client.patchProfile({ name });
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
    setIsLoadingWorkspace(false);
    isLoadingWorkspaceRef.current = false;
    workspaceRequestIdRef.current += 1;
    setStage("intro");
  }

  if (stage === "intro") {
    return <IntroScreen onGetStarted={() => setStage("auth")} />;
  }

  if (stage === "auth") {
    return (
      <AuthScreens
        onRegister={(payload) => handleAuth("register", payload)}
        onLogin={(payload) => handleAuth("login", payload)}
      />
    );
  }

  if (stage === "name") {
    return <NameScreen onSubmit={handleName} />;
  }

  if (stage === "onboarding") {
    return (
      <>
        <OnboardingScreen isLoading={isLoadingWorkspace} onShowWorkspace={loadWorkspace} />
        {workspaceError ? <p className="floating-error">{workspaceError}</p> : null}
      </>
    );
  }

  if (!profile || !completeness) {
    return null;
  }

  return <Workspace profile={profile} completeness={completeness} onLogout={handleLogout} />;
}

function NameScreen({ onSubmit }: { onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your name.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">First, a name</p>
        <h1>What should I call you?</h1>
        <label>
          Your name
          <input
            autoComplete="name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-accent" disabled={isSubmitting} type="submit">
          Nice to meet you
        </button>
      </form>
    </main>
  );
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
