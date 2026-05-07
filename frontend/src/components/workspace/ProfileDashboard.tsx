"use client";

import type { CopyKey } from "../../i18n/copy";
import { useLang } from "../../i18n/LangProvider";
import type { DemoProfile, SectionState } from "../../fixtures/careerpalDemoData";
import { Slime } from "../Slime";

export type ProfileSectionId = "basics" | "summarySec" | "experience" | "skills" | "projects" | "education";

const SECTIONS: Array<{ id: ProfileSectionId; icon: string; label: CopyKey; stateKey: keyof DemoProfile }> = [
  { id: "basics", icon: "◆", label: "sec_basics", stateKey: "basics" },
  { id: "summarySec", icon: "✦", label: "sec_summary", stateKey: "summarySec" },
  { id: "experience", icon: "▤", label: "sec_experience", stateKey: "experience" },
  { id: "skills", icon: "✜", label: "sec_skills", stateKey: "skills" },
  { id: "projects", icon: "◐", label: "sec_projects", stateKey: "projects" },
  { id: "education", icon: "▲", label: "sec_education", stateKey: "education" },
];

interface ProfileDashboardProps {
  profile: DemoProfile;
  onImprove: () => void;
  onSection: (section: ProfileSectionId) => void;
}

export function ProfileDashboard({ profile, onImprove, onSection }: ProfileDashboardProps) {
  const { t } = useLang();
  const completed = SECTIONS.filter((section) => sectionState(profile, section.stateKey) === "complete").length;
  const completion = Math.round((completed / SECTIONS.length) * 100);

  return (
    <div className="page-pad" data-screen-label="05 Profile">
      <div className="profile-hero">
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div className="profile-hero-avatar">{profile.initials}</div>
          <div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 500, margin: 0 }}>{profile.name}</h1>
            <div style={{ color: "var(--ink-3)", fontSize: 15, marginTop: 4 }}>
              {profile.role} · {profile.location}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500 }}>
              {t("profile_completion")}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22 }}>{completion}%</div>
          </div>
          <button className="btn btn-accent" type="button" onClick={onImprove}>
            <Slime size={18} state="speaking" />
            {t("profile_improve")}
          </button>
        </div>
      </div>

      <div className="profile-grid">
        {SECTIONS.map((section) => {
          const state = sectionState(profile, section.stateKey);
          return (
            <article className="profile-card" key={section.id} onClick={() => onSection(section.id)}>
              <div className="profile-card-head">
                <div className="profile-card-icon">{section.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="profile-card-title">{t(section.label)}</div>
                  <div className={`profile-card-state ${state}`}>{stateLabel(t, state)}</div>
                </div>
                <button
                  className="profile-card-edit"
                  type="button"
                  aria-label={`${t("profile_edit")} ${t(section.label)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSection(section.id);
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M1.5 10.5L1.5 8.5L8 2L10 4L3.5 10.5L1.5 10.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              {section.id === "summarySec" ? <div className="profile-card-body">{profile.summary}</div> : null}
              {section.id === "experience" ? (
                <div className="profile-card-body">
                  {profile.experience.items.slice(0, 2).map((item) => (
                    <div className="profile-card-row" key={`${item.company}-${item.role}-${item.time}`}>
                      <div className="profile-card-row-title">
                        {item.role} · {item.company}
                      </div>
                      <div className="profile-card-row-meta">{item.time}</div>
                      <div className="profile-card-row-note">{item.description}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {section.id === "skills" ? (
                <div className="profile-card-body">
                  <div className="profile-skill-list">
                    {profile.skills.items.slice(0, 4).map((skill) => (
                      <span className="profile-skill-pill" key={skill.name}>
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {section.id === "projects" ? (
                <div className="profile-card-body">
                  {profile.projects.items.slice(0, 2).map((project, index) => (
                    <div className="profile-card-row" key={`${project.name}-${project.description}-${index}`}>
                      <div className="profile-card-row-title">{project.name}</div>
                      <div className="profile-card-row-note">{project.description}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {section.id === "education" ? (
                <div className="profile-card-body">
                  {profile.education.items.slice(0, 2).map((item, index) => (
                    <div className="profile-card-row" key={`${item.school}-${item.degree}-${item.time}-${index}`}>
                      <div className="profile-card-row-title">{item.school}</div>
                      <div className="profile-card-row-meta">{item.degree}</div>
                      <div className="profile-card-row-note">{item.time}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function sectionState(profile: DemoProfile, key: keyof DemoProfile): SectionState {
  const section = profile[key];
  return typeof section === "object" && section !== null && "state" in section ? section.state : "empty";
}

function stateLabel(t: (key: CopyKey) => string, state: SectionState) {
  if (state === "complete") return t("state_complete");
  if (state === "partial") return t("state_partial");
  return t("state_empty");
}
