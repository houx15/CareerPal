import type { CompletenessState } from "../lib/types";

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

const SECTION_LABELS: Record<string, string> = {
  basics: "Basics",
  summary: "Summary",
  experience: "Experience",
  skills: "Skills",
  projects: "Projects",
  education: "Education",
};

export function Workspace({ profile, completeness, onLogout }: WorkspaceProps) {
  const name = profile.name || "Your profile";

  return (
    <main className="workspace-shell">
      <section className="workspace-main" aria-labelledby="workspace-title">
        <div className="workspace-topline">
          <p className="eyebrow">CareerPal workspace</p>
          <button className="btn btn-text" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
        <h1 id="workspace-title">{name}</h1>
        <p className="workspace-subtitle">{profile.headline || "Let CareerPal turn your background into a living profile."}</p>
        {profile.target_direction ? <p className="target-pill">{profile.target_direction}</p> : null}
        <div className="chat-column workspace-chat" aria-label="CareerPal conversation">
          <div className="chat-bubble assistant">
            I have started your workspace. Tell me about one project, role, class, or achievement you want this profile
            to remember.
          </div>
        </div>
      </section>
      <aside className="side-panel" aria-label="Profile completion">
        <h2>Profile completion</h2>
        <p className="overall-state">Overall: {completeness.overall}</p>
        <dl className="completion-list">
          {Object.entries(completeness.sections).map(([key, state]) => (
            <div className="completion-row" key={key}>
              <dt>{SECTION_LABELS[key] ?? titleize(key)}</dt>
              <dd>{state}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </main>
  );
}

function titleize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
