"use client";

import { useMemo, useState } from "react";
import { sampleProfiles, type DemoProfile } from "../../fixtures/careerpalDemoData";
import type { CopyKey } from "../../i18n/copy";
import { LangToggle, useLang } from "../../i18n/LangProvider";
import type { CompletenessState, ProfilePatch, ProjectItem, SkillItem } from "../../lib/types";
import { Slime } from "../Slime";
import { ProfileDashboard, type ProfileSectionId } from "./ProfileDashboard";
import { EditDrawer, ImproveChatOverlay } from "./WorkspaceOverlays";
import { ResumeScreen } from "./ResumeScreen";
import { MatchScreen } from "./MatchScreen";
import { GrowScreen } from "./GrowScreen";
import { ActivityScreen } from "./ActivityScreen";
import { SettingsScreen } from "./SettingsScreen";

export interface WorkspaceUser {
  name: string;
  initials: string;
  email: string;
  handle: string;
}

interface WorkspaceProps {
  user: WorkspaceUser;
  onLogout: () => void;
  profile?: ProfilePatch;
  completeness?: { sections: Record<string, CompletenessState> };
  onPatchProfile?: (payload: ProfilePatch) => Promise<ProfilePatch>;
}

type Tab = "profile" | "match" | "resume" | "grow" | "activity" | "settings";

const NAV: Array<{ id: Tab; label: CopyKey }> = [
  { id: "profile", label: "nav_profile" },
  { id: "match", label: "nav_match" },
  { id: "resume", label: "nav_resume" },
  { id: "grow", label: "nav_grow" },
  { id: "activity", label: "nav_activity" },
];

export function Workspace({ user, onLogout, profile: persistedProfile, completeness, onPatchProfile }: WorkspaceProps) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<Tab>("profile");
  const [improveSection, setImproveSection] = useState<"any" | "basics" | "summary" | "experience" | "skills" | "projects" | "education" | null>(null);
  const [editSection, setEditSection] = useState<ProfileSectionId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedProfile, setSavedProfile] = useState<ProfilePatch>({});
  const profile = useMemo<DemoProfile>(
    () => {
      const education = savedProfile.education ?? persistedProfile?.education;
      const experience = savedProfile.experience ?? persistedProfile?.experience;
      const projects = savedProfile.projects ?? persistedProfile?.projects;
      const projectItems = projects?.map(normalizeProjectForWorkspace);
      const skills = savedProfile.skills ?? persistedProfile?.skills;
      const skillItems = skills?.map(normalizeSkillForWorkspace);

      return {
        ...sampleProfiles[lang],
        name: savedProfile.name ?? persistedProfile?.name ?? user.name,
        initials: user.initials,
        email: savedProfile.contact_email ?? persistedProfile?.contact_email ?? user.email,
        handle: user.handle,
        role: savedProfile.headline ?? persistedProfile?.headline ?? sampleProfiles[lang].role,
        location: savedProfile.location ?? persistedProfile?.location ?? sampleProfiles[lang].location,
        phone: savedProfile.phone ?? persistedProfile?.phone ?? sampleProfiles[lang].phone,
        summary: savedProfile.comment ?? persistedProfile?.comment ?? sampleProfiles[lang].summary,
        education:
          education === undefined
            ? sampleProfiles[lang].education
            : {
                state: education.length > 0 ? "complete" : "empty",
                items: education,
              },
        experience:
          experience === undefined
            ? sampleProfiles[lang].experience
            : {
                state: experience.length > 0 ? "complete" : "empty",
                items: experience,
              },
        projects:
          projectItems === undefined
            ? sampleProfiles[lang].projects
            : {
                state: savedProfile.projects !== undefined ? projectSectionState(projectItems) : completeness?.sections.projects ?? projectSectionState(projectItems),
                items: projectItems,
              },
        skills:
          skillItems === undefined
            ? sampleProfiles[lang].skills
            : {
                state: savedProfile.skills !== undefined ? skillSectionState(skillItems) : completeness?.sections.skills ?? skillSectionState(skillItems),
                items: skillItems,
              },
      };
    },
    [
      lang,
      persistedProfile?.comment,
      persistedProfile?.education,
      persistedProfile?.experience,
      persistedProfile?.headline,
      persistedProfile?.contact_email,
      persistedProfile?.location,
      persistedProfile?.name,
      persistedProfile?.phone,
      persistedProfile?.projects,
      persistedProfile?.skills,
      completeness?.sections.projects,
      completeness?.sections.skills,
      savedProfile.comment,
      savedProfile.contact_email,
      savedProfile.education,
      savedProfile.experience,
      savedProfile.headline,
      savedProfile.location,
      savedProfile.name,
      savedProfile.phone,
      savedProfile.projects,
      savedProfile.skills,
      user.email,
      user.handle,
      user.initials,
      user.name,
    ],
  );

  function openChatFromEdit(section: ProfileSectionId) {
    setEditSection(null);
    setImproveSection(section === "summarySec" ? "summary" : section);
  }

  async function patchProfile(payload: ProfilePatch): Promise<void> {
    const nextProfile = onPatchProfile ? await onPatchProfile(payload) : payload;
    setSavedProfile((current) => ({ ...current, ...payload, ...nextProfile }));
  }

  return (
    <main className="app-shell">
      <header className="app-bar">
        <div className="app-bar-left">
          <div className="app-bar-brand">
            <Slime size={26} state="listening" />
            {t("brand")}
          </div>
          <nav className="app-nav">
            {NAV.map((item) => (
              <button className={`app-nav-btn${tab === item.id ? " active" : ""}`} type="button" key={item.id} onClick={() => setTab(item.id)}>
                {t(item.label)}
              </button>
            ))}
          </nav>
        </div>
        <div className="app-bar-right">
          <LangToggle compact />
          <div style={{ position: "relative" }}>
            <button className="user-pill" type="button" onClick={() => setMenuOpen((open) => !open)}>
              <span className="user-pill-avatar">{user.initials}</span>
              <span>{user.name}</span>
            </button>
            {menuOpen ? (
              <div className="user-menu">
                <button type="button" onClick={() => setTab("settings")}>
                  {t("nav_settings")}
                </button>
                <button type="button" onClick={onLogout}>
                  {t("logout")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {tab === "profile" ? <ProfileDashboard profile={profile} onImprove={() => setImproveSection("any")} onSection={setEditSection} /> : null}
      {tab === "resume" ? <ResumeScreen profile={profile} onOpenMatch={() => setTab("match")} /> : null}
      {tab === "match" ? <MatchScreen profile={profile} /> : null}
      {tab === "grow" ? <GrowScreen /> : null}
      {tab === "activity" ? <ActivityScreen /> : null}
      {tab === "settings" ? <SettingsScreen onLogout={onLogout} /> : null}

      {improveSection ? <ImproveChatOverlay user={user} initialSection={improveSection} onClose={() => setImproveSection(null)} /> : null}
      {editSection ? (
        <EditDrawer section={editSection} profile={profile} onClose={() => setEditSection(null)} onChatInstead={openChatFromEdit} onSave={patchProfile} />
      ) : null}
    </main>
  );
}

function normalizeProjectForWorkspace(project: ProjectItem): ProjectItem {
  return {
    ...project,
    name: project.name || String(project.title ?? ""),
    description: project.description || String(project.note ?? ""),
    tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack : [],
    achievements: Array.isArray(project.achievements) ? project.achievements : [],
    link: typeof project.link === "string" ? project.link : null,
    comment: typeof project.comment === "string" ? project.comment : null,
  };
}

function normalizeSkillForWorkspace(skill: SkillItem): DemoProfile["skills"]["items"][number] {
  const proficiency = isSkillProficiency(skill.proficiency) ? skill.proficiency : "intermediate";

  return {
    ...skill,
    name: skill.name || "",
    category: skill.category || "",
    proficiency,
    comment: typeof skill.comment === "string" ? skill.comment : null,
    years: typeof skill.years === "number" ? skill.years : 0,
    level: typeof skill.level === "number" ? skill.level : levelForProficiency(proficiency),
  };
}

function projectSectionState(projects: ProjectItem[]): CompletenessState {
  if (projects.length === 0) {
    return "empty";
  }

  const hasCompleteProject = projects.some(
    (project) =>
      project.name.trim() &&
      project.description.trim() &&
      project.tech_stack.some((tech) => tech.trim()) &&
      project.achievements.some((achievement) => achievement.trim()),
  );

  return hasCompleteProject ? "complete" : "partial";
}

function skillSectionState(skills: SkillItem[]): CompletenessState {
  if (skills.length === 0) {
    return "empty";
  }

  return skills.some((skill) => skill.name.trim() && skill.category.trim() && isSkillProficiency(skill.proficiency)) ? "complete" : "partial";
}

function isSkillProficiency(value: unknown): value is SkillItem["proficiency"] {
  return value === "beginner" || value === "intermediate" || value === "advanced" || value === "expert";
}

function levelForProficiency(proficiency: SkillItem["proficiency"]): number {
  if (proficiency === "expert") return 0.9;
  if (proficiency === "advanced") return 0.75;
  if (proficiency === "intermediate") return 0.55;
  return 0.3;
}
