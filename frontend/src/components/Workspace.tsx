import type {
  CertificateItem,
  CompletenessState,
  EducationItem,
  ExperienceItem,
  GeneratedPage,
  PageStyleTemplate,
  ProjectItem,
  SkillItem,
} from "../lib/types";
import type { ProfilePatch } from "../lib/types";
import { Workspace as PrototypeWorkspace } from "./workspace/Workspace";
import type { ImproveChatMessage, ImproveChatSendPayload, ImproveSection } from "./workspace/WorkspaceOverlays";

export interface WorkspaceProfile {
  name: string | null;
  phone: string | null;
  contact_email: string | null;
  location: string | null;
  headline: string | null;
  target_direction: string | null;
  comment: string | null;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: SkillItem[];
  certificates: CertificateItem[];
}

export interface WorkspaceCompleteness {
  overall: CompletenessState;
  sections: Record<string, CompletenessState>;
}

interface WorkspaceProps {
  profile: WorkspaceProfile;
  completeness: WorkspaceCompleteness;
  accountUsername?: string;
  onLogout: () => void;
  onPatchProfile: (payload: ProfilePatch) => Promise<Partial<WorkspaceProfile>>;
  conversationMessages?: ImproveChatMessage[];
  conversationFocus?: ImproveSection | null;
  onSendMessage?: (payload: ImproveChatSendPayload) => void | Promise<void>;
  onOpenConversation?: (section: ImproveSection) => void;
  generatedPage?: GeneratedPage | null;
  pageConversationMessages?: Array<{ role: "ai" | "user"; body: string }>;
  isGeneratingPage?: boolean;
  pageError?: string | null;
  onGeneratePage?: (styleTemplate: PageStyleTemplate) => void | Promise<void>;
  onCustomizePage?: (instruction: string) => void | Promise<void>;
  isUpdatingPageVisibility?: boolean;
  onPublishPage?: () => void | Promise<void>;
  onUnpublishPage?: () => void | Promise<void>;
  onOpenPublicPage?: (url: string) => void;
}

export function Workspace({
  profile,
  completeness,
  accountUsername,
  onLogout,
  onPatchProfile,
  conversationMessages,
  conversationFocus,
  onSendMessage,
  onOpenConversation,
  generatedPage,
  pageConversationMessages,
  isGeneratingPage,
  pageError,
  onGeneratePage,
  onCustomizePage,
  isUpdatingPageVisibility,
  onPublishPage,
  onUnpublishPage,
  onOpenPublicPage,
}: WorkspaceProps) {
  const name = profile.name || "CareerPal user";

  return (
    <PrototypeWorkspace
      user={{
        name,
        initials: initialsForName(name),
        email: "",
        handle: accountUsername ?? usernameFromName(name),
      }}
      profile={{
        name: profile.name,
        phone: profile.phone,
        contact_email: profile.contact_email,
        location: profile.location,
        headline: profile.headline,
        target_direction: profile.target_direction,
        comment: profile.comment,
        education: profile.education,
        experience: profile.experience,
        projects: profile.projects,
        skills: profile.skills,
        certificates: profile.certificates,
      }}
      completeness={completeness}
      conversationMessages={conversationMessages}
      conversationFocus={conversationFocus}
      onSendMessage={onSendMessage}
      onOpenConversation={onOpenConversation}
      generatedPage={generatedPage}
      pageConversationMessages={pageConversationMessages}
      isGeneratingPage={isGeneratingPage}
      pageError={pageError}
      onGeneratePage={onGeneratePage}
      onCustomizePage={onCustomizePage}
      isUpdatingPageVisibility={isUpdatingPageVisibility}
      onPublishPage={onPublishPage}
      onUnpublishPage={onUnpublishPage}
      onOpenPublicPage={onOpenPublicPage}
      onLogout={onLogout}
      onPatchProfile={async (payload) => {
        const saved = await onPatchProfile(payload);
        return {
          name: saved.name ?? undefined,
          phone: saved.phone ?? undefined,
          contact_email: saved.contact_email ?? undefined,
          location: saved.location ?? undefined,
          headline: saved.headline ?? undefined,
          target_direction: saved.target_direction ?? undefined,
          comment: saved.comment ?? undefined,
          education: saved.education,
          experience: saved.experience,
          projects: saved.projects,
          skills: saved.skills,
          certificates: saved.certificates,
        };
      }}
    />
  );
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

function usernameFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "careerpal";
}
