"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sampleProfiles, type DemoProfile } from "../../fixtures/careerpalDemoData";
import type { CopyKey } from "../../i18n/copy";
import { LangToggle, useLang } from "../../i18n/LangProvider";
import type { CertificateItem, CompletenessState, EducationItem, ExperienceItem, ProfilePatch, ProjectItem, SkillItem } from "../../lib/types";
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
  const [improveSection, setImproveSection] = useState<"any" | "basics" | "summary" | "experience" | "skills" | "projects" | "education" | "certificates" | null>(null);
  const [editSection, setEditSection] = useState<ProfileSectionId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedProfile, setSavedProfile] = useState<ProfilePatch>({});
  const [localSectionOverrides, setLocalSectionOverrides] = useState<Set<ProfileSectionId>>(new Set());
  const lastCompletenessRef = useRef<WorkspaceProps["completeness"] | undefined>(undefined);
  useEffect(() => {
    if (lastCompletenessRef.current && lastCompletenessRef.current !== completeness) {
      setLocalSectionOverrides(new Set());
    }
    lastCompletenessRef.current = completeness;
  }, [completeness]);

  const profile = useMemo<DemoProfile>(
    () => {
      const education = savedProfile.education ?? persistedProfile?.education;
      const experience = savedProfile.experience ?? persistedProfile?.experience;
      const projects = savedProfile.projects ?? persistedProfile?.projects;
      const projectItems = projects?.map(normalizeProjectForWorkspace);
      const skills = savedProfile.skills ?? persistedProfile?.skills;
      const skillItems = skills?.map(normalizeSkillForWorkspace);
      const certificates = savedProfile.certificates ?? persistedProfile?.certificates;
      const certificateItems = certificates?.map(normalizeCertificateForWorkspace);
      const hasSavedBasics = localSectionOverrides.has("basics");
      const hasPersistedBasics =
        persistedProfile?.name !== undefined || persistedProfile?.headline !== undefined || persistedProfile?.target_direction !== undefined;
      const hasSavedSummary = localSectionOverrides.has("summarySec");
      const hasPersistedSummary = persistedProfile?.comment !== undefined;

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
        basics:
          hasSavedBasics || hasPersistedBasics
            ? {
                state: hasSavedBasics
                  ? basicsSectionState({
                      name: savedProfile.name ?? persistedProfile?.name,
                      headline: savedProfile.headline ?? persistedProfile?.headline,
                      target_direction: savedProfile.target_direction ?? persistedProfile?.target_direction,
                    })
                  : completeness?.sections.basics ??
                    basicsSectionState({
                      name: persistedProfile?.name,
                      headline: persistedProfile?.headline,
                      target_direction: persistedProfile?.target_direction,
                    }),
              }
            : sampleProfiles[lang].basics,
        summarySec:
          hasSavedSummary || hasPersistedSummary
            ? {
                state: hasSavedSummary
                  ? summarySectionState(savedProfile.comment ?? persistedProfile?.comment)
                  : completeness?.sections.summary ?? summarySectionState(persistedProfile?.comment),
              }
            : sampleProfiles[lang].summarySec,
        education:
          education === undefined
            ? sampleProfiles[lang].education
            : {
                state: localSectionOverrides.has("education") ? educationSectionState(education) : completeness?.sections.education ?? educationSectionState(education),
                items: education,
              },
        experience:
          experience === undefined
            ? sampleProfiles[lang].experience
            : {
                state: localSectionOverrides.has("experience") ? experienceSectionState(experience) : completeness?.sections.experience ?? experienceSectionState(experience),
                items: experience,
              },
        projects:
          projectItems === undefined
            ? sampleProfiles[lang].projects
            : {
                state: localSectionOverrides.has("projects") ? projectSectionState(projectItems) : completeness?.sections.projects ?? projectSectionState(projectItems),
                items: projectItems,
              },
        skills:
          skillItems === undefined
            ? sampleProfiles[lang].skills
            : {
                state: localSectionOverrides.has("skills") ? skillSectionState(skillItems) : completeness?.sections.skills ?? skillSectionState(skillItems),
                items: skillItems,
              },
        certificates:
          certificateItems === undefined
            ? sampleProfiles[lang].certificates
            : {
                state:
                  localSectionOverrides.has("certificates")
                    ? certificateSectionState(certificateItems)
                    : completeness?.sections.certificates ?? certificateSectionState(certificateItems),
                items: certificateItems,
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
      persistedProfile?.target_direction,
      persistedProfile?.projects,
      persistedProfile?.skills,
      persistedProfile?.certificates,
      completeness?.sections.basics,
      completeness?.sections.summary,
      completeness?.sections.education,
      completeness?.sections.experience,
      completeness?.sections.projects,
      completeness?.sections.skills,
      completeness?.sections.certificates,
      localSectionOverrides,
      savedProfile.comment,
      savedProfile.contact_email,
      savedProfile.education,
      savedProfile.experience,
      savedProfile.headline,
      savedProfile.location,
      savedProfile.name,
      savedProfile.phone,
      savedProfile.target_direction,
      savedProfile.projects,
      savedProfile.skills,
      savedProfile.certificates,
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
    setLocalSectionOverrides(sectionOverridesForPatch(payload));
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

function sectionOverridesForPatch(payload: ProfilePatch): Set<ProfileSectionId> {
  const sections = new Set<ProfileSectionId>();
  if (payload.name !== undefined || payload.headline !== undefined || payload.target_direction !== undefined) {
    sections.add("basics");
  }
  if (payload.comment !== undefined) {
    sections.add("summarySec");
  }
  if (payload.education !== undefined) {
    sections.add("education");
  }
  if (payload.experience !== undefined) {
    sections.add("experience");
  }
  if (payload.projects !== undefined) {
    sections.add("projects");
  }
  if (payload.skills !== undefined) {
    sections.add("skills");
  }
  if (payload.certificates !== undefined) {
    sections.add("certificates");
  }
  return sections;
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

function normalizeCertificateForWorkspace(certificate: CertificateItem): CertificateItem {
  return {
    name: certificate.name || "",
    issuer: certificate.issuer || "",
    date: certificate.date || "",
    comment: typeof certificate.comment === "string" ? certificate.comment : null,
  };
}

function basicsSectionState(values: { name?: string | null; headline?: string | null; target_direction?: string | null }): CompletenessState {
  return fieldsState([values.name, values.headline, values.target_direction]);
}

function summarySectionState(comment?: string | null): CompletenessState {
  return hasText(comment) ? "complete" : "empty";
}

function educationSectionState(education: EducationItem[]): CompletenessState {
  if (education.length === 0) {
    return "empty";
  }

  return education.some((item) => hasText(item.school) && hasText(item.degree) && hasText(item.time)) ? "complete" : "partial";
}

function experienceSectionState(experience: ExperienceItem[]): CompletenessState {
  if (experience.length === 0) {
    return "empty";
  }

  return experience.some(
    (item) =>
      hasText(item.company) &&
      hasText(item.role) &&
      hasText(item.time) &&
      hasText(item.description) &&
      item.achievements.some((achievement) => hasText(achievement)),
  )
    ? "complete"
    : "partial";
}

function projectSectionState(projects: ProjectItem[]): CompletenessState {
  if (projects.length === 0) {
    return "empty";
  }

  const hasCompleteProject = projects.some(
    (project) =>
      hasText(project.name) &&
      hasText(project.description) &&
      project.tech_stack.some((tech) => hasText(tech)) &&
      project.achievements.some((achievement) => hasText(achievement)),
  );

  return hasCompleteProject ? "complete" : "partial";
}

function skillSectionState(skills: SkillItem[]): CompletenessState {
  if (skills.length === 0) {
    return "empty";
  }

  return skills.some((skill) => hasText(skill.name) && hasText(skill.category) && isSkillProficiency(skill.proficiency)) ? "complete" : "partial";
}

function certificateSectionState(certificates: CertificateItem[]): CompletenessState {
  if (certificates.length === 0) {
    return "empty";
  }

  return certificates.some((certificate) => hasText(certificate.name) && hasText(certificate.issuer) && hasText(certificate.date)) ? "complete" : "partial";
}

function fieldsState(values: Array<string | null | undefined>): CompletenessState {
  const presentCount = values.filter(hasText).length;
  if (presentCount === values.length) {
    return "complete";
  }
  if (presentCount > 0) {
    return "partial";
  }
  return "empty";
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
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
