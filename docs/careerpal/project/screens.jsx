// Profile dashboard, MySpace, Settings, UserMenu (top-right dropdown)
const { useState: useStateS, useContext: useCtxS, useEffect: useEffectS, useRef: useRefS } = React;

const ProfileDashboard = ({ profile, onImprove, onSection }) => {
  const { t, lang } = useCtxS(LangContext);
  const sectionDefs = [
    { id: "basics",     icon: "◆", data: profile.basics },
    { id: "summarySec", icon: "✦", data: profile.summarySec, key: "summary" },
    { id: "experience", icon: "▤", data: profile.experience },
    { id: "skills",     icon: "✜", data: profile.skills },
    { id: "projects",   icon: "◐", data: profile.projects },
    { id: "education",  icon: "▲", data: profile.education },
  ];
  const completed = sectionDefs.filter((s) => s.data?.state === "complete").length;
  const completion = Math.round((completed / sectionDefs.length) * 100);

  return (
    <div className="page-pad" data-screen-label="05 Profile">
      <div className="profile-hero">
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div className="profile-hero-avatar">{profile.initials}</div>
          <div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
              {profile.name}
            </h1>
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
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.02em" }}>{completion}%</div>
          </div>
          <button className="btn btn-accent" onClick={onImprove}>
            <Slime size={18} state="speaking" />{t("profile_improve")}
          </button>
        </div>
      </div>

      <div className="profile-grid">
        {sectionDefs.map((s) => {
          const sectionKey = s.key || s.id;
          const stateLabel = s.data?.state === "complete" ? t("state_complete")
            : s.data?.state === "partial" ? t("state_partial") : t("state_empty");
          return (
            <div key={s.id} className="profile-card" onClick={() => onSection(s.id)}>
              <div className="profile-card-head">
                <div className="profile-card-icon">{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="profile-card-title">{t("sec_" + sectionKey)}</div>
                  <div className={"profile-card-state " + (s.data?.state || "empty")}>{stateLabel}</div>
                </div>
                <button className="profile-card-edit" onClick={(e) => { e.stopPropagation(); onSection(s.id); }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}><path d="M1.5 10.5L1.5 8.5L8 2L10 4L3.5 10.5L1.5 10.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                  {t("profile_edit")}
                </button>
              </div>
              {s.id === "experience" && s.data?.items?.length > 0 && (
                <div className="profile-card-body">
                  {s.data.items.slice(0, 2).map((x, i) => (
                    <div key={i} className="profile-card-row">
                      <div className="profile-card-row-title">{x.role} · {x.co}</div>
                      <div className="profile-card-row-meta">{x.time}</div>
                      <div className="profile-card-row-note">{x.note}</div>
                    </div>
                  ))}
                </div>
              )}
              {s.id === "skills" && s.data?.items?.length > 0 && (
                <div className="profile-card-body">
                  <div className="profile-skill-list">
                    {s.data.items.slice(0, 4).map((sk, i) => (
                      <span key={i} className="profile-skill-pill">{sk.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {s.id === "summarySec" && (
                <div className="profile-card-body">
                  <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{profile.summary}</div>
                </div>
              )}
              {s.id === "education" && s.data?.items?.length > 0 && (
                <div className="profile-card-body">
                  {s.data.items.map((e, i) => (
                    <div key={i} className="profile-card-row">
                      <div className="profile-card-row-title">{e.school}</div>
                      <div className="profile-card-row-meta">{e.degree} · {e.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ───────── My Resume — merged living-resume site + tailored versions ───────── */
const ResumeScreen = ({ user, profile, onOpenMatch }) => {
  const { t, lang } = useCtxS(LangContext);
  const history = lang === "zh" ? MATCH_HISTORY_ZH : MATCH_HISTORY_EN;
  const versions = history.filter((m) => m.saved);
  const [openVersion, setOpenVersion] = useStateS(null);
  const [tpl, setTpl] = useStateS("clean");
  const [siteCreated, setSiteCreated] = useStateS(false);

  const tpls = [
    { id: "clean", color: "linear-gradient(135deg,#fff,#fafaf8)", border: "#e5e5e0" },
    { id: "modern", color: "linear-gradient(135deg,#efebff,#fff)", border: "#d8d0ff" },
    { id: "terminal", color: "linear-gradient(135deg,#1a1a1f,#2a2a32)", border: "#3a3a42", dark: true },
    { id: "journal", color: "linear-gradient(135deg,#fff8f0,#fdebd9)", border: "#f0d9b8" },
  ];

  if (openVersion) {
    return <VersionDetail version={openVersion} profile={profile} onBack={() => setOpenVersion(null)} />;
  }

  return (
    <div className="page-pad" data-screen-label="06 My resume">
      <div className="page-head">
        <h1>{t("resume_title")}</h1>
        <p>{t("resume_sub")}</p>
      </div>

      {/* Top: Living resume site */}
      <section className="resume-site">
        <div className="resume-site-head">
          <div>
            <div className="resume-site-title">{t("resume_site_title")}</div>
            <div className="resume-site-sub">{t("resume_site_sub")}</div>
          </div>
          {siteCreated && (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm">{t("resume_site_edit")}</button>
              <button className="btn btn-accent btn-sm">{t("resume_site_open")}</button>
            </div>
          )}
        </div>

        <div className="resume-site-stage">
          {tpls.map((x) => (
            <button key={x.id} className={"resume-tpl" + (tpl === x.id ? " selected" : "")} onClick={() => setTpl(x.id)}>
              <div className="resume-tpl-thumb" style={{ background: x.color, borderColor: x.border }}>
                <div className="tpl-thumb-bar" style={{ background: x.dark ? "#3a3a42" : "#e5e5e0" }}></div>
                <div className="tpl-thumb-block" style={{ background: x.dark ? "#5367F3" : "#1d1d1f", width: "55%" }}></div>
                <div className="tpl-thumb-block" style={{ background: x.dark ? "#5e577d" : "#a8a8a8", width: "75%" }}></div>
                <div className="tpl-thumb-block" style={{ background: x.dark ? "#5e577d" : "#c8c8c8", width: "40%" }}></div>
              </div>
              <div className="tpl-name">{t("tpl_" + x.id)}</div>
            </button>
          ))}
        </div>

        {!siteCreated && (
          <div className="resume-site-foot">
            <div className="resume-site-url">careerpal.co/{user.handle}</div>
            <button className="btn btn-accent" onClick={() => setSiteCreated(true)}>
              {t("resume_site_create")}<span>→</span>
            </button>
          </div>
        )}
      </section>

      {/* Below: tailored versions */}
      <section style={{ marginTop: 32 }}>
        <div className="resume-section-head">
          <div>
            <div className="resume-section-title">{t("resume_versions")}</div>
            <div className="resume-section-sub">{t("resume_versions_sub")}</div>
          </div>
          <button className="btn btn-accent btn-sm" onClick={onOpenMatch}>+ {t("resume_new")}</button>
        </div>

        <div className="version-master">
          <div className="version-master-icon">★</div>
          <div style={{ flex: 1 }}>
            <div className="version-master-title">{t("resume_master")}</div>
            <div className="version-master-hint">{t("resume_master_hint")}</div>
          </div>
        </div>

        <div className="version-grid">
          {versions.map((v, i) => (
            <button key={v.id} className="version-card" onClick={() => setOpenVersion({ ...v, _diff: 4 + (i % 5) })}>
              <div className="version-card-branch">
                <div className="version-branch-line"></div>
                <div className="version-branch-dot"></div>
              </div>
              <div className="version-card-body">
                <div className="version-card-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="version-card-title">{v.role}</div>
                    <div className="version-card-meta">{t("versions_used_for")} · {v.co}</div>
                  </div>
                  <div className="version-card-score">{v.score}</div>
                </div>
                <div className="version-card-foot">
                  <span>{t("versions_updated").replace("{when}", v.date)}</span>
                  <span>{t("versions_diff").replace("{n}", String(4 + (i % 5)))}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

/* Version detail — profile snapshot + matched JD side-by-side */
const VersionDetail = ({ version, profile, onBack }) => {
  const { t, lang } = useCtxS(LangContext);
  const sampleJD_zh = `我们正在寻找一位${version.role},加入${version.co}的核心产品团队。

岗位职责
· 主导核心场景的产品设计,从洞察到落地
· 与算法、工程、运营紧密协作,把 AI 能力转化为用户价值
· 建立可复用的设计规范,推动团队水位提升

任职要求
· 5 年以上产品/交互设计经验,有 AI 产品经验优先
· 熟悉端到端的设计流程,有数据驱动的设计思维
· 良好的跨职能沟通能力,能在模糊中定义问题`;
  const sampleJD_en = `We're hiring a ${version.role} to join the core product team at ${version.co}.

What you'll do
• Lead end-to-end product design for our core surfaces
• Partner with engineering, ML, and ops to ship AI features that feel inevitable
• Build reusable design patterns and raise the team's craft floor

What we're looking for
• 5+ years in product / interaction design; AI product experience a plus
• Strong end-to-end fluency with a data-driven mindset
• Comfortable defining problems in ambiguity`;

  return (
    <div className="page-pad" data-screen-label="06b Version detail">
      <button className="btn btn-text" onClick={onBack} style={{ marginBottom: 16 }}>← {t("version_back")}</button>

      <div className="version-detail-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="version-detail-eyebrow">{t("versions_used_for")} · {version.co}</div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", margin: "4px 0 0" }}>{version.role}</h1>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
            {t("version_jd_meta").replace("{when}", version.date).replace("{score}", version.score)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost">{t("version_export")}</button>
          <button className="btn btn-accent">{t("version_apply")}<span>→</span></button>
        </div>
      </div>

      <div className="version-detail-grid">
        {/* Profile snapshot */}
        <div className="panel">
          <div className="panel-title">{t("version_view_profile")}</div>
          <div className="vd-profile-name">{profile.name}</div>
          <div className="vd-profile-role">{profile.role} · {profile.location}</div>
          <div className="vd-block">
            <div className="vd-block-title">{t("sec_summary")}</div>
            <div className="vd-block-body">{profile.summary}</div>
          </div>
          <div className="vd-block">
            <div className="vd-block-title">{t("sec_experience")}</div>
            {profile.experience.items.slice(0, 2).map((x, i) => (
              <div key={i} className="vd-exp-item">
                <div className="vd-exp-row"><span style={{ fontWeight: 500 }}>{x.role}</span> · {x.co}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{x.time}</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>{x.note}</div>
              </div>
            ))}
          </div>
          <div className="vd-block">
            <div className="vd-block-title">{t("sec_skills")}</div>
            <div className="profile-skill-list">
              {profile.skills.items.slice(0, 5).map((s, i) => <span key={i} className="profile-skill-pill">{s.name}</span>)}
            </div>
          </div>
        </div>

        {/* Matched JD */}
        <div className="panel">
          <div className="panel-title">{t("version_view_jd")}</div>
          <div className="vd-jd">{lang === "zh" ? sampleJD_zh : sampleJD_en}</div>
        </div>
      </div>
    </div>
  );
};

const SettingsScreen = ({ user, onLogout }) => {
  const { t, lang, setLang } = useCtxS(LangContext);
  const [name, setName] = useStateS(user.name);
  const [email, setEmail] = useStateS(user.email);
  const [phone, setPhone] = useStateS(user.phone || "+86 138 0000 0000");
  const [verify, setVerify] = useStateS(null); // null | { kind, target, code }
  const [toast, setToast] = useStateS("");

  const startVerify = (kind, target) => setVerify({ kind, target, code: "" });
  const confirmVerify = () => {
    if (verify.code.length !== 6) return;
    if (verify.kind === "email") { setEmail(verify.target); setToast(t("settings_email_changed")); }
    else { setPhone(verify.target); setToast(t("settings_phone_changed")); }
    setVerify(null);
    setTimeout(() => setToast(""), 2200);
  };

  return (
    <div className="page-pad" data-screen-label="09 Settings">
      <div className="page-head"><h1>{t("settings_title")}</h1></div>

      <div className="panel">
        <div className="panel-title">{t("settings_account")}</div>
        <div className="panel-row">
          <div className="panel-row-label">{lang === "zh" ? "姓名" : "Name"}</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <span></span>
        </div>
        <EditableContact label={t("email")} value={email} kind="email"
                         placeholder="you@example.com"
                         newLabel={t("settings_new_email")}
                         onStartVerify={startVerify} t={t} />
        <EditableContact label={t("phone")} value={phone} kind="phone"
                         placeholder="+86 138 0000 0000"
                         newLabel={t("settings_new_phone")}
                         onStartVerify={startVerify} t={t} />
      </div>

      <div className="panel">
        <div className="panel-row">
          <div className="panel-row-label">{t("settings_lang")}</div>
          <div></div>
          <div className="lang-toggle">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-row">
          <div className="panel-row-label">{t("settings_logout")}</div>
          <div></div>
          <button className="btn btn-ghost" onClick={onLogout}>{t("settings_logout")}</button>
        </div>
        <div className="panel-row">
          <div className="panel-row-label">{t("settings_delete")}</div>
          <div></div>
          <button className="danger-btn">{t("settings_delete")}</button>
        </div>
      </div>

      {verify && (
        <div className="overlay-back" onClick={() => setVerify(null)}>
          <div className="verify-modal" onClick={(e) => e.stopPropagation()}>
            <div className="verify-title">{t(verify.kind === "email" ? "settings_verify_email_title" : "settings_verify_phone_title")}</div>
            <div className="verify-sub">{t(verify.kind === "email" ? "settings_verify_email_sub" : "settings_verify_phone_sub").replace("{target}", verify.target)}</div>
            <input className="input verify-input" maxLength={6} autoFocus
                   placeholder="123456"
                   value={verify.code}
                   onChange={(e) => setVerify({ ...verify, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            <button type="button" className="btn-link" style={{ alignSelf: "flex-start", fontSize: 12.5 }}
                    onClick={() => setVerify({ ...verify, code: "" })}>{t("resend_code")}</button>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={() => setVerify(null)}>{t("settings_cancel")}</button>
              <button className="btn btn-accent" disabled={verify.code.length !== 6} onClick={confirmVerify}>
                {t("verify")}<span style={{ fontSize: 14 }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="settings-toast">✓ {toast}</div>}
    </div>
  );
};

const EditableContact = ({ label, value, kind, placeholder, newLabel, onStartVerify, t }) => {
  const [editing, setEditing] = useStateS(false);
  const [draft, setDraft] = useStateS("");
  const valid = kind === "email"
    ? draft.includes("@") && draft.includes(".")
    : draft.replace(/\D/g, "").length >= 7;

  if (!editing) {
    return (
      <div className="panel-row">
        <div className="panel-row-label">{label}</div>
        <div style={{ color: "var(--ink-2)" }}>{value}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(""); setEditing(true); }}>
          {t("settings_change")}
        </button>
      </div>
    );
  }
  return (
    <div className="panel-row" style={{ alignItems: "flex-start" }}>
      <div className="panel-row-label">{newLabel}</div>
      <input className="input" placeholder={placeholder} autoFocus
             value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t("settings_cancel")}</button>
        <button className="btn btn-accent btn-sm" disabled={!valid}
                onClick={() => { onStartVerify(kind, draft); setEditing(false); }}>
          {t("send_code")}
        </button>
      </div>
    </div>
  );
};

/* User menu — clickable top-right avatar that opens a popover with Settings + Logout */
const UserMenu = ({ user, onSettings, onLogout }) => {
  const { t } = useCtxS(LangContext);
  const [open, setOpen] = useStateS(false);
  const ref = useRefS(null);
  useEffectS(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="user-menu-avatar">{user.initials}</div>
        <span className="user-menu-name">{user.name}</span>
        <span className="user-menu-caret">⌄</span>
      </button>
      {open && (
        <div className="user-menu-popover">
          <div className="user-menu-header">
            <div className="user-menu-avatar lg">{user.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: "var(--ink)" }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </div>
            </div>
          </div>
          <button className="user-menu-item" onClick={() => { setOpen(false); onSettings(); }}>
            <span className="user-menu-icon">⚙</span>{t("menu_settings")}
          </button>
          <button className="user-menu-item" onClick={() => { setOpen(false); onLogout(); }}>
            <span className="user-menu-icon">↪</span>{t("menu_logout")}
          </button>
        </div>
      )}
    </div>
  );
};

/* ───────── Activity timeline screen ───────── */
const ACTIVITY_ZH = [
  { day: "today", kind: "profile", icon: "✦", title: "更新了「个人简介」", note: "由 Pal 根据你最新的对话整理。" },
  { day: "today", kind: "match",   icon: "◇", title: "匹配新岗位:MiniMax · AI 产品设计师", note: "契合度 88,已保存为简历版本。" },
  { day: "yesterday", kind: "grow",    icon: "▲", title: "技能「Agent 工作流」+8% 掌握度", note: "你提交了一段 LangGraph 实战记录。" },
  { day: "yesterday", kind: "profile", icon: "▤", title: "新增工作经历:字节跳动", note: "通过对话补充了 2 项成就。" },
  { day: "earlier",   kind: "profile", icon: "✜", title: "新增技能:AI / Prompt", note: "起始掌握度 45%。" },
  { day: "earlier",   kind: "match",   icon: "◇", title: "匹配岗位:阿里 · 高级交互设计师", note: "契合度 79。" },
  { day: "earlier",   kind: "grow",    icon: "★", title: "设定成长目标:成为 AI 产品设计负责人", note: "Pal 为你生成了 7 个学习节点。" },
];
const ACTIVITY_EN = [
  { day: "today", kind: "profile", icon: "✦", title: "Updated 'About you'", note: "Pulled from your last chat with Pal." },
  { day: "today", kind: "match",   icon: "◇", title: "New match: Anthropic · Senior PD, AI", note: "Fit 87, saved as a resume version." },
  { day: "yesterday", kind: "grow",    icon: "▲", title: "Skill 'Agent workflows' +8% mastery", note: "You shared a LangGraph build log." },
  { day: "yesterday", kind: "profile", icon: "▤", title: "Added experience: Linear", note: "Two highlights captured via chat." },
  { day: "earlier",   kind: "profile", icon: "✜", title: "Added skill: AI / Prompting", note: "Starting mastery 45%." },
  { day: "earlier",   kind: "match",   icon: "◇", title: "Match: Notion · Sr. UX Designer", note: "Fit 79." },
  { day: "earlier",   kind: "grow",    icon: "★", title: "Goal set: Head of AI Design", note: "Pal generated a 7-node learning path." },
];

const ActivityScreen = () => {
  const { t, lang } = useCtxS(LangContext);
  const items = lang === "zh" ? ACTIVITY_ZH : ACTIVITY_EN;
  const [filter, setFilter] = useStateS("all");
  const filtered = filter === "all" ? items : items.filter((x) => x.kind === filter);

  const groups = ["today", "yesterday", "earlier"];
  const grouped = groups.map((g) => ({ day: g, items: filtered.filter((x) => x.day === g) }));

  return (
    <div className="page-pad" data-screen-label="07 Activity">
      <div className="page-head">
        <h1>{t("activity_title")}</h1>
        <p>{t("activity_sub")}</p>
      </div>

      <div className="activity-filters">
        {[
          { id: "all",     label: t("activity_filter_all") },
          { id: "profile", label: t("activity_filter_profile") },
          { id: "match",   label: t("activity_filter_match") },
          { id: "grow",    label: t("activity_filter_grow") },
        ].map((f) => (
          <button key={f.id}
                  className={"activity-filter" + (filter === f.id ? " active" : "")}
                  onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="activity-timeline">
        {grouped.map((g) => g.items.length > 0 && (
          <div key={g.day} className="activity-group">
            <div className="activity-day">{t("activity_" + g.day)}</div>
            <div className="activity-list">
              {g.items.map((it, i) => (
                <div key={i} className={"activity-row " + it.kind}>
                  <div className="activity-icon">{it.icon}</div>
                  <div className="activity-stem"></div>
                  <div className="activity-body">
                    <div className="activity-title">{it.title}</div>
                    <div className="activity-note">{it.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.ProfileDashboard = ProfileDashboard;
window.SettingsScreen = SettingsScreen;
window.UserMenu = UserMenu;
window.ResumeScreen = ResumeScreen;
window.ActivityScreen = ActivityScreen;
