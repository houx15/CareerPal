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
    <main className="app-shell">
      <header className="app-bar">
        <div className="app-bar-left">
          <div className="app-bar-brand">CareerPal</div>
          <nav className="app-nav">
            {["Profile", "Match", "My resume", "Grow", "Activity"].map((label, index) => (
              <button className={`app-nav-btn${index === 0 ? " active" : ""}`} type="button" key={label}>
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="app-bar-right">
          <button className="btn btn-text" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <section className="page-pad" aria-labelledby="workspace-title">
        <div className="profile-hero">
          <div>
            <h1 id="workspace-title" style={{ fontFamily: "var(--serif)", margin: 0 }}>
              {name}
            </h1>
            <div style={{ color: "var(--ink-3)", fontSize: 15, marginTop: 4 }}>
              {profile.headline || "Let CareerPal turn your background into a living profile."}
            </div>
            {profile.target_direction ? <div className="target-pill" style={{ marginTop: 10 }}>{profile.target_direction}</div> : null}
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500 }}>
              Profile completion
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22 }}>Overall: {completeness.overall}</div>
          </div>
        </div>
        <div className="profile-grid">
          {Object.entries(completeness.sections).map(([key, state]) => (
            <article className="profile-card" key={key}>
              <div className="profile-card-head">
                <div className="profile-card-icon">◆</div>
                <div>
                  <div className="profile-card-title">{SECTION_LABELS[key] ?? titleize(key)}</div>
                  <div className={`profile-card-state ${state}`}>{state}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function titleize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
