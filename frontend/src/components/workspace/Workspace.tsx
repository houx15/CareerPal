"use client";

import { useMemo, useState } from "react";
import { sampleProfiles, type DemoProfile } from "../../fixtures/careerpalDemoData";
import type { CopyKey } from "../../i18n/copy";
import { LangToggle, useLang } from "../../i18n/LangProvider";
import type { ProfilePatch } from "../../lib/types";
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

export function Workspace({ user, onLogout, profile: persistedProfile, onPatchProfile }: WorkspaceProps) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<Tab>("profile");
  const [improveSection, setImproveSection] = useState<"any" | "basics" | "summary" | "experience" | "skills" | "projects" | "education" | null>(null);
  const [editSection, setEditSection] = useState<ProfileSectionId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedProfile, setSavedProfile] = useState<ProfilePatch>({});
  const profile = useMemo<DemoProfile>(
    () => {
      const education = savedProfile.education ?? persistedProfile?.education;

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
      };
    },
    [
      lang,
      persistedProfile?.comment,
      persistedProfile?.education,
      persistedProfile?.headline,
      persistedProfile?.contact_email,
      persistedProfile?.location,
      persistedProfile?.name,
      persistedProfile?.phone,
      savedProfile.comment,
      savedProfile.contact_email,
      savedProfile.education,
      savedProfile.headline,
      savedProfile.location,
      savedProfile.name,
      savedProfile.phone,
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
