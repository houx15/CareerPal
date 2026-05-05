import type { CompletenessState } from "../lib/types";
import { Workspace as PrototypeWorkspace } from "./workspace/Workspace";

export interface WorkspaceProfile {
  name: string | null;
  headline: string | null;
  target_direction: string | null;
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
}

export function Workspace({ profile, onLogout }: WorkspaceProps) {
  const name = profile.name || "CareerPal user";

  return (
    <PrototypeWorkspace
      user={{
        name,
        initials: initialsForName(name),
        email: "",
        handle: usernameFromName(name),
      }}
      onLogout={onLogout}
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
