"use client";

import { useMemo, useRef, useState } from "react";
import { LangProvider } from "../i18n/LangProvider";
import { ApiClient, ApiError, type PdfExport } from "../lib/api";
import type {
  Conversation,
  ConversationMessage,
  CustomizePagePayload,
  GeneratedPage,
  PageStyleTemplate,
  ProfilePatch,
  ResumeStructureResponse,
  ResumeUploadResponse,
  PageSettingsPayload,
} from "../lib/types";
import { LoginScreen, NameIntro, SignUpScreen } from "./AuthScreens";
import { IntroPage } from "./IntroPage";
import { Onboarding } from "./Onboarding";
import { Workspace, type WorkspaceCompleteness, type WorkspaceProfile } from "./Workspace";

type AuthPayload = { email: string; username: string; password: string };
type LoginPayload = { email: string; password: string };
type AuthResult = { access_token: string; user: { id: string; email: string; username: string } };
type AccountUser = AuthResult["user"];

export interface StageApi {
  register(payload: AuthPayload): Promise<AuthResult>;
  login(payload: LoginPayload): Promise<AuthResult>;
  patchProfile(payload: ProfilePatch): Promise<Partial<WorkspaceProfile>>;
  getProfile(): Promise<WorkspaceProfile>;
  getCompleteness(): Promise<WorkspaceCompleteness>;
  listConversations?(): Promise<Conversation[]>;
  getConversation?(id: string): Promise<Conversation>;
  startConversation?(payload: { context_type: "career" | "page"; focus_node?: string | null }): Promise<Conversation>;
  sendMessage?(payload: { conversation_id: string; content: string }): Promise<{
    conversation_id: string;
    assistant_message: ConversationMessage;
    messages: ConversationMessage[];
  }>;
  uploadResume?(file: File): Promise<ResumeUploadResponse>;
  structureResume?(resumeId: string): Promise<ResumeStructureResponse>;
  getPagePreview?(): Promise<GeneratedPage>;
  generatePage?(styleTemplate: PageStyleTemplate): Promise<GeneratedPage>;
  customizePage?(payload: CustomizePagePayload): Promise<GeneratedPage>;
  updatePageSettings?(payload: PageSettingsPayload): Promise<GeneratedPage>;
  exportProfilePdf?(): Promise<PdfExport>;
}

interface StageAppProps {
  api?: StageApi;
}

type Stage = "intro" | "login" | "signup" | "name" | "onboarding" | "workspace";
type SessionUser = { name: string; initials: string; email: string };
type ImproveSection = "any" | "basics" | "summary" | "experience" | "skills" | "projects" | "education" | "certificates";

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
  const [onboardingConversation, setOnboardingConversation] = useState<Conversation | null>(null);
  const [improveConversation, setImproveConversation] = useState<Conversation | null>(null);
  const [pageConversation, setPageConversation] = useState<Conversation | null>(null);
  const [generatedPage, setGeneratedPage] = useState<GeneratedPage | null>(null);
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [isUpdatingPageVisibility, setIsUpdatingPageVisibility] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const isLoadingWorkspaceRef = useRef(false);
  const workspaceRequestIdRef = useRef(0);

  const client = useMemo<StageApi>(() => api ?? createBrowserApi(readStoredToken), [api]);

  async function handleAuth(action: "register" | "login", payload: AuthPayload | LoginPayload) {
    const result =
      action === "register" ? await client.register(payload as AuthPayload) : await client.login(payload as LoginPayload);
    storeToken(result.access_token);
    setPendingEmail(result.user.email);
    setAccountUser(result.user);
    if (action === "register") {
      setStage("name");
      return;
    }

    await loadWorkspace();
  }

  async function handleName(name: string) {
    await client.patchProfile({ name });
    const conversation = await ensureCareerConversation(null);
    setOnboardingConversation(conversation ?? null);
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
      const [nextProfile, nextCompleteness, conversation, latestPage] = await Promise.all([
        client.getProfile(),
        client.getCompleteness(),
        ensureCareerConversation(null),
        loadLatestPagePreview(),
      ]);
      if (workspaceRequestIdRef.current !== requestId) {
        return;
      }

      setProfile(nextProfile);
      setCompleteness(nextCompleteness);
      setOnboardingConversation(conversation ?? null);
      setGeneratedPage(latestPage);
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
    setOnboardingConversation(null);
    setImproveConversation(null);
    setPageConversation(null);
    setGeneratedPage(null);
    setIsGeneratingPage(false);
    setIsUpdatingPageVisibility(false);
    setIsExportingPdf(false);
    setPageError(null);
    setPendingEmail("");
    setSessionUser(null);
    setAccountUser(null);
    setIsLoadingWorkspace(false);
    isLoadingWorkspaceRef.current = false;
    workspaceRequestIdRef.current += 1;
    setStage("intro");
  }

  async function handlePatchProfile(payload: ProfilePatch): Promise<Partial<WorkspaceProfile>> {
    const saved = await client.patchProfile(payload);
    const nextCompleteness = await client.getCompleteness();
    setProfile((current) => (current ? { ...current, ...saved } : current));
    setCompleteness(nextCompleteness);
    return saved;
  }

  async function ensureCareerConversation(focusNode: string | null): Promise<Conversation | undefined> {
    if (onboardingConversation && (onboardingConversation.focus_node ?? null) === focusNode) {
      return onboardingConversation;
    }

    if (client.listConversations && client.getConversation) {
      const conversations = await client.listConversations();
      const existing = conversations.find(
        (conversation) =>
          conversation.context_type === "career" &&
          (conversation.focus_node ?? null) === focusNode,
      );

      if (existing) {
        return client.getConversation(existing.id);
      }
    }

    return client.startConversation?.({ context_type: "career", focus_node: focusNode });
  }

  async function loadLatestPagePreview(): Promise<GeneratedPage | null> {
    if (!client.getPagePreview) {
      return null;
    }

    try {
      return await client.getPagePreview();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        return null;
      }

      throw caught;
    }
  }

  async function ensurePageConversation(): Promise<Conversation | undefined> {
    if (pageConversation) {
      return pageConversation;
    }

    if (client.listConversations && client.getConversation) {
      const conversations = await client.listConversations();
      const existing = conversations.find(
        (conversation) => conversation.context_type === "page" && (conversation.focus_node ?? null) === null,
      );

      if (existing) {
        const conversation = await client.getConversation(existing.id);
        setPageConversation(conversation);
        return conversation;
      }
    }

    const conversation = await client.startConversation?.({ context_type: "page", focus_node: null });
    setPageConversation(conversation ?? null);
    return conversation;
  }

  async function handleOnboardingMessage(content: string | ConversationMessage): Promise<void> {
    if (!onboardingConversation || !client.sendMessage) {
      return;
    }

    const messageContent = typeof content === "string" ? content : content.content;
    const response = await client.sendMessage({ conversation_id: onboardingConversation.id, content: messageContent });
    setOnboardingConversation((current) =>
      current && current.id === onboardingConversation.id ? { ...current, messages: response.messages } : current,
    );
  }

  async function handleImportResume(file: File): Promise<ResumeUploadResponse> {
    if (!client.uploadResume) {
      throw new Error("Resume upload is not available.");
    }

    return client.uploadResume(file);
  }

  async function handleStructureResume(resumeId: string): Promise<ResumeStructureResponse> {
    if (!client.structureResume) {
      throw new Error("Resume structuring is not available.");
    }

    const response = await client.structureResume(resumeId);
    const [nextProfile, nextCompleteness] = await Promise.all([client.getProfile(), client.getCompleteness()]);
    setProfile(nextProfile);
    setCompleteness(nextCompleteness);
    if (client.getConversation) {
      setOnboardingConversation(await client.getConversation(response.conversation_id));
    }
    return response;
  }

  async function handleOpenImproveConversation(section: ImproveSection): Promise<void> {
    const conversation = await ensureCareerConversation(focusNodeForImproveSection(section));
    setImproveConversation(conversation ?? null);
  }

  async function handleImproveMessage(payload: {
    body: string;
    section: ImproveSection;
    attachmentName: string | null;
  }): Promise<void> {
    if (!client.sendMessage) {
      return;
    }

    const focusNode = focusNodeForImproveSection(payload.section);
    const conversation = improveConversation && (improveConversation.focus_node ?? null) === focusNode
      ? improveConversation
      : await ensureCareerConversation(focusNode);

    if (!conversation) {
      return;
    }

    const content = payload.attachmentName
      ? [payload.body, `Attached: ${payload.attachmentName}`].filter(Boolean).join(" · ")
      : payload.body;
    const response = await client.sendMessage({ conversation_id: conversation.id, content });
    setImproveConversation({ ...conversation, messages: response.messages });
  }

  async function handleGeneratePage(styleTemplate: PageStyleTemplate): Promise<void> {
    if (!client.generatePage) {
      return;
    }

    setIsGeneratingPage(true);
    setPageError(null);

    try {
      setGeneratedPage(await client.generatePage(styleTemplate));
    } catch (caught) {
      setPageError(caught instanceof Error ? caught.message : "Could not generate your page.");
    } finally {
      setIsGeneratingPage(false);
    }
  }

  async function handleCustomizePage(instruction: string): Promise<void> {
    if (!client.customizePage) {
      return;
    }

    setIsGeneratingPage(true);
    setPageError(null);

    try {
      const conversation = await ensurePageConversation();
      if (!conversation) {
        throw new Error("Page chat is not available.");
      }

      const nextPage = await client.customizePage({ conversation_id: conversation.id, instruction });
      setGeneratedPage(nextPage);
      if (client.getConversation) {
        setPageConversation(await client.getConversation(conversation.id));
      }
    } catch (caught) {
      setPageError(caught instanceof Error ? caught.message : "Could not update your page.");
      throw caught;
    } finally {
      setIsGeneratingPage(false);
    }
  }

  async function updatePageVisibility(isPublic: boolean): Promise<void> {
    if (!client.updatePageSettings) {
      return;
    }

    setIsUpdatingPageVisibility(true);
    setPageError(null);

    try {
      setGeneratedPage(await client.updatePageSettings({ is_public: isPublic }));
    } catch (caught) {
      setPageError(caught instanceof Error ? caught.message : "Could not update page settings.");
    } finally {
      setIsUpdatingPageVisibility(false);
    }
  }

  async function handleDownloadPdf(): Promise<void> {
    if (!client.exportProfilePdf) {
      return;
    }

    setIsExportingPdf(true);
    setPageError(null);

    try {
      const pdf = await client.exportProfilePdf();
      const url = URL.createObjectURL(pdf.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = pdf.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setPageError(caught instanceof Error ? caught.message : "Could not export PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleOpenPublicPage(url: string): void {
    if (typeof window === "undefined") {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
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
          conversationMessages={onboardingConversation?.messages}
          onSendMessage={handleOnboardingMessage}
          onImportResume={handleImportResume}
          onStructureResume={handleStructureResume}
          onDone={loadWorkspace}
        />
        {workspaceError ? <p className="floating-error">{workspaceError}</p> : null}
      </>
    );
  }

  if (!profile || !completeness) {
    return null;
  }

  const publicUsername =
    accountUser?.username ?? (pendingEmail ? usernameFromEmail(pendingEmail) : usernameFromName(profile.name || "CareerPal user"));
  const generatedPageForWorkspace = generatedPage
    ? {
        ...generatedPage,
        public_url: generatedPage.public_url ?? publicPageUrlForUsername(publicUsername),
      }
    : null;

  return (
    <Workspace
      profile={profile}
      completeness={completeness}
      accountUsername={accountUser?.username}
      conversationMessages={improveConversation ? toImproveMessages(improveConversation.messages) : undefined}
      conversationFocus={improveConversation ? improveSectionForFocusNode(improveConversation.focus_node) : null}
      onSendMessage={handleImproveMessage}
      onOpenConversation={handleOpenImproveConversation}
      generatedPage={generatedPageForWorkspace}
      pageConversationMessages={pageConversation ? toImproveMessages(pageConversation.messages) : undefined}
      isGeneratingPage={isGeneratingPage}
      isExportingPdf={isExportingPdf}
      isUpdatingPageVisibility={isUpdatingPageVisibility}
      pageError={pageError}
      onGeneratePage={handleGeneratePage}
      onExportPdf={handleDownloadPdf}
      onCustomizePage={handleCustomizePage}
      onPublishPage={() => updatePageVisibility(true)}
      onUnpublishPage={() => updatePageVisibility(false)}
      onOpenPublicPage={handleOpenPublicPage}
      onLogout={handleLogout}
      onPatchProfile={handlePatchProfile}
    />
  );
}

function focusNodeForImproveSection(section: ImproveSection): string | null {
  return section === "any" ? null : section;
}

function improveSectionForFocusNode(focusNode: string | null | undefined): ImproveSection {
  return focusNode === null || focusNode === undefined ? "any" : (focusNode as ImproveSection);
}

function toImproveMessages(messages: ConversationMessage[]): Array<{ role: "ai" | "user"; body: string }> {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "ai" : "user",
    body: message.content,
  }));
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

function usernameFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "careerpal";
}

function publicPageUrlForUsername(username: string): string {
  const path = `/p/${username}`;
  const baseUrl = defaultApiBaseUrl().replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${path}` : path;
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
