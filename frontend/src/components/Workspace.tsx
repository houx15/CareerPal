import type { CompletenessState } from "../lib/types";
import type { ProfilePatch } from "../lib/types";
import { Workspace as PrototypeWorkspace } from "./workspace/Workspace";

export interface WorkspaceProfile {
  name: string | null;
  phone: string | null;
  contact_email: string | null;
  location: string | null;
  headline: string | null;
  target_direction: string | null;
  comment: string | null;
  education: Record<string, unknown>[];
  experience: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  certificates: Record<string, unknown>[];
}

export interface WorkspaceCompleteness {
  overall: CompletenessState;
  sections: Record<string, CompletenessState>;
}

interface WorkspaceProps {
  profile: WorkspaceProfile;
  completeness: WorkspaceCompleteness;
  onLogout: () => void;
  onPatchProfile: (payload: ProfilePatch) => Promise<Partial<WorkspaceProfile>>;
}

export function Workspace({ profile, onLogout, onPatchProfile }: WorkspaceProps) {
  const name = profile.name || "CareerPal user";

  return (
    <PrototypeWorkspace
      user={{
        name,
        initials: initialsForName(name),
        email: "",
        handle: usernameFromName(name),
      }}
      profile={{
        name: profile.name,
        phone: profile.phone,
        contact_email: profile.contact_email,
        location: profile.location,
        headline: profile.headline,
        target_direction: profile.target_direction,
        comment: profile.comment,
      }}
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
