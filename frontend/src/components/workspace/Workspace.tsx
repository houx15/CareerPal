"use client";

import { useMemo, useState } from "react";
import { sampleProfiles, type DemoProfile } from "../../fixtures/careerpalDemoData";
import type { CopyKey } from "../../i18n/copy";
import { LangToggle, useLang } from "../../i18n/LangProvider";
import { Slime } from "../Slime";
import { ProfileDashboard, type ProfileSectionId } from "./ProfileDashboard";
import { EditDrawer, ImproveChatOverlay } from "./WorkspaceOverlays";

export interface WorkspaceUser {
  name: string;
  initials: string;
  email: string;
  handle: string;
}

interface WorkspaceProps {
  user: WorkspaceUser;
  onLogout: () => void;
}

type Tab = "profile" | "match" | "resume" | "grow" | "activity" | "settings";

const NAV: Array<{ id: Tab; label: CopyKey }> = [
  { id: "profile", label: "nav_profile" },
  { id: "match", label: "nav_match" },
  { id: "resume", label: "nav_resume" },
  { id: "grow", label: "nav_grow" },
  { id: "activity", label: "nav_activity" },
];

export function Workspace({ user, onLogout }: WorkspaceProps) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<Tab>("profile");
  const [improveSection, setImproveSection] = useState<"any" | "basics" | "summary" | "experience" | "skills" | "projects" | "education" | null>(null);
  const [editSection, setEditSection] = useState<ProfileSectionId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = useMemo<DemoProfile>(
    () => ({
      ...sampleProfiles[lang],
      name: user.name,
      initials: user.initials,
      email: user.email,
      handle: user.handle,
    }),
    [lang, user.email, user.handle, user.initials, user.name],
  );

  function openChatFromEdit(section: ProfileSectionId) {
    setEditSection(null);
    setImproveSection(section === "summarySec" ? "summary" : section);
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

      {tab === "profile" ? (
        <ProfileDashboard profile={profile} onImprove={() => setImproveSection("any")} onSection={setEditSection} />
      ) : (
        <PlaceholderScreen tab={tab} />
      )}

      {improveSection ? <ImproveChatOverlay user={user} initialSection={improveSection} onClose={() => setImproveSection(null)} /> : null}
      {editSection ? (
        <EditDrawer section={editSection} profile={profile} onClose={() => setEditSection(null)} onChatInstead={openChatFromEdit} />
      ) : null}
    </main>
  );
}

function PlaceholderScreen({ tab }: { tab: Tab }) {
  const { t } = useLang();

  return (
    <section className="page-pad">
      <div className="page-head">
        <h1>{tab === "settings" ? t("nav_settings") : tab}</h1>
        <p>Coming in the next frontend phase.</p>
      </div>
    </section>
  );
}
