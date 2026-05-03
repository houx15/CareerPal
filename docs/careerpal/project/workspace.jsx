// Workspace shell — top nav + active screen + improve overlay + edit drawer
const { useState: useStateW, useContext: useCtxW, useRef: useRefW, useEffect: useEffectW } = React;

/* ───────── Improve overlay — section chips + file attach ───────── */
const IMPROVE_SECTIONS = [
  { id: "any",        labelKey: "improve_any" },
  { id: "basics",     labelKey: "improve_chip_basics" },
  { id: "summary",    labelKey: "improve_chip_summary" },
  { id: "experience", labelKey: "improve_chip_experience" },
  { id: "skills",     labelKey: "improve_chip_skills" },
  { id: "projects",   labelKey: "improve_chip_projects" },
  { id: "education",  labelKey: "improve_chip_education" },
];

const ImproveChatOverlay = ({ user, initialSection, onClose }) => {
  const { t } = useCtxW(LangContext);
  const [section, setSection] = useStateW(initialSection || "any");
  const [attached, setAttached] = useStateW(null);
  const [input, setInput] = useStateW("");
  const fileRef = useRefW(null);
  const streamRef = useRefW(null);

  const introFor = (sec) => {
    if (sec === "any") return t("improve_intro_any");
    const sectionName = t("improve_chip_" + sec);
    return t("improve_intro_section").replace("{section}", sectionName);
  };
  const [messages, setMessages] = useStateW([
    { role: "ai", state: "speaking", body: introFor(section) },
  ]);

  // When the user changes section chip, append a new Pal prompt
  const switchSection = (sec) => {
    if (sec === section) return;
    setSection(sec);
    setMessages((p) => [...p, { role: "ai", state: "speaking", body: introFor(sec) }]);
  };

  useEffectW(() => { if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight; }, [messages]);

  const send = (text) => {
    if (!text.trim() && !attached) return;
    const body = attached
      ? (text.trim() ? text + "  ·  📎 " + attached : "📎 " + attached)
      : text;
    setMessages((p) => [...p, { role: "user", body }, { role: "ai", state: "thinking", body: null }]);
    setInput("");
    setAttached(null);
    setTimeout(() => {
      setMessages((p) => {
        const n = [...p];
        n[n.length - 1] = { role: "ai", state: "happy", body: t("onb_done") };
        return n;
      });
    }, 1100);
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setAttached(f.name);
    e.target.value = "";
  };

  return (
    <div className="overlay-back" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Slime size={28} state="speaking" />
            <div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500 }}>Pal</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("improve_title")}</div>
            </div>
          </div>
          <button className="btn-text" onClick={onClose} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}>×</button>
        </div>

        {/* Section picker */}
        <div className="improve-pick">
          <div className="improve-pick-label">{t("improve_pick")}</div>
          <div className="improve-chip-row">
            {IMPROVE_SECTIONS.map((s) => (
              <button key={s.id}
                      className={"improve-chip" + (section === s.id ? " active" : "")}
                      onClick={() => switchSection(s.id)}>
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-stream" ref={streamRef} style={{ padding: "16px 24px", flex: 1 }}>
          {messages.map((m, i) => m.role === "user" ? (
            <div key={i} className="msg-row user">
              <div className="msg-avatar-user">{user.initials}</div>
              <div className="msg-bubble">{m.body}</div>
            </div>
          ) : (
            <div key={i} className="msg-row">
              <div className="msg-avatar"><Slime size={36} state={m.state} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="msg-meta"><span>Pal</span></div>
                <div className="msg-bubble">{m.body || <span className="typing"><span></span><span></span><span></span></span>}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="composer">
          {attached && (
            <div className="composer-attach">
              <span>📎 {attached}</span>
              <button className="composer-attach-x" onClick={() => setAttached(null)}>×</button>
            </div>
          )}
          <div className="composer-row">
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={onPickFile} accept=".pdf,.doc,.docx,.txt,.md" />
            <button className="composer-attach-btn" title={t("improve_attach")} onClick={() => fileRef.current?.click()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10.5 5L5.5 10C4.67 10.83 4.67 12.17 5.5 13C6.33 13.83 7.67 13.83 8.5 13L13.5 8C15.16 6.34 15.16 3.66 13.5 2C11.84 0.34 9.16 0.34 7.5 2L2.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
            <textarea className="composer-input" rows={1} placeholder={t("composer_ph")}
                      value={input} onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
            <button className="composer-send" disabled={!input.trim() && !attached} onClick={() => send(input)}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────── Edit drawer — traditional form editing ───────── */
const EditDrawer = ({ section, profile, onClose, onChatInstead }) => {
  const { t } = useCtxW(LangContext);
  const sectionName = section === "summarySec" ? t("sec_summary") : t("sec_" + section);
  const [draft, setDraft] = useStateW(() => structuredClone(profile));

  const upd = (path, value) => {
    setDraft((d) => {
      const next = { ...d };
      const segs = path.split(".");
      let cur = next;
      for (let i = 0; i < segs.length - 1; i++) {
        const k = segs[i];
        cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
        cur = cur[k];
      }
      cur[segs[segs.length - 1]] = value;
      return next;
    });
  };
  const updateItem = (sec, idx, key, val) => {
    setDraft((d) => {
      const items = [...(d[sec].items || [])];
      items[idx] = { ...items[idx], [key]: val };
      return { ...d, [sec]: { ...d[sec], items } };
    });
  };
  const addItem = (sec, blank) => {
    setDraft((d) => ({ ...d, [sec]: { ...d[sec], items: [...(d[sec].items || []), blank] } }));
  };
  const removeItem = (sec, idx) => {
    setDraft((d) => {
      const items = [...(d[sec].items || [])];
      items.splice(idx, 1);
      return { ...d, [sec]: { ...d[sec], items } };
    });
  };

  return (
    <div className="overlay-back" onClick={onClose}>
      <div className="edit-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="edit-drawer-head">
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {t("edit_title").replace("{section}", sectionName)}
            </div>
            <button className="btn-link" style={{ fontSize: 12.5, marginTop: 4 }} onClick={onChatInstead}>
              <Slime size={14} state="listening" /> {t("edit_via_chat")}
            </button>
          </div>
          <button className="btn-text" onClick={onClose} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}>×</button>
        </div>

        <div className="edit-drawer-body">
          {section === "basics" && (
            <>
              <Field label={t("field_name")} value={draft.name} onChange={(v) => upd("name", v)} />
              <Field label={t("field_role")} value={draft.role} onChange={(v) => upd("role", v)} />
              <Field label={t("field_loc")} value={draft.location} onChange={(v) => upd("location", v)} />
              <Field label={t("field_email")} value={draft.email} onChange={(v) => upd("email", v)} />
              <Field label={t("field_phone")} value={draft.phone || ""} onChange={(v) => upd("phone", v)} placeholder="—" />
            </>
          )}

          {section === "summarySec" && (
            <Field label={t("field_summary")} value={draft.summary} onChange={(v) => upd("summary", v)}
                   placeholder={t("field_summary_ph")} multiline rows={5} />
          )}

          {section === "experience" && (
            <>
              {(draft.experience.items || []).map((x, i) => (
                <div key={i} className="edit-card">
                  <div className="edit-card-row">
                    <Field label={t("field_company")} value={x.co} onChange={(v) => updateItem("experience", i, "co", v)} />
                    <Field label={t("field_jobtitle")} value={x.role} onChange={(v) => updateItem("experience", i, "role", v)} />
                  </div>
                  <Field label={t("field_period")} value={x.time} onChange={(v) => updateItem("experience", i, "time", v)}
                         placeholder={t("field_period_ph")} />
                  <Field label={t("field_highlight")} value={x.note} onChange={(v) => updateItem("experience", i, "note", v)}
                         placeholder={t("field_highlight_ph")} multiline rows={3} />
                  <button className="edit-remove" onClick={() => removeItem("experience", i)}>{t("edit_remove")}</button>
                </div>
              ))}
              <button className="edit-add"
                      onClick={() => addItem("experience", { co: "", role: "", time: "", note: "" })}>
                + {t("edit_add")}
              </button>
            </>
          )}

          {section === "skills" && (
            <>
              {(draft.skills.items || []).map((sk, i) => (
                <div key={i} className="edit-card">
                  <div className="edit-card-row">
                    <Field label={t("field_skill")} value={sk.name} onChange={(v) => updateItem("skills", i, "name", v)} />
                    <Field label={t("field_years")} value={String(sk.years)} onChange={(v) => updateItem("skills", i, "years", parseInt(v) || 0)} />
                  </div>
                  <button className="edit-remove" onClick={() => removeItem("skills", i)}>{t("edit_remove")}</button>
                </div>
              ))}
              <button className="edit-add"
                      onClick={() => addItem("skills", { name: "", years: 1, level: 0.4 })}>
                + {t("edit_add")}
              </button>
            </>
          )}

          {section === "education" && (
            <>
              {(draft.education.items || []).map((e, i) => (
                <div key={i} className="edit-card">
                  <Field label={t("field_school")} value={e.school} onChange={(v) => updateItem("education", i, "school", v)} />
                  <div className="edit-card-row">
                    <Field label={t("field_degree")} value={e.degree} onChange={(v) => updateItem("education", i, "degree", v)} />
                    <Field label={t("field_period")} value={e.time} onChange={(v) => updateItem("education", i, "time", v)} placeholder={t("field_period_ph")} />
                  </div>
                  <button className="edit-remove" onClick={() => removeItem("education", i)}>{t("edit_remove")}</button>
                </div>
              ))}
              <button className="edit-add"
                      onClick={() => addItem("education", { school: "", degree: "", time: "" })}>
                + {t("edit_add")}
              </button>
            </>
          )}

          {section === "projects" && (
            <>
              {(draft.projects.items || []).map((p, i) => (
                <div key={i} className="edit-card">
                  <Field label={t("field_jobtitle")} value={p.title || ""} onChange={(v) => updateItem("projects", i, "title", v)} />
                  <Field label={t("field_highlight")} value={p.note || ""} onChange={(v) => updateItem("projects", i, "note", v)}
                         placeholder={t("field_highlight_ph")} multiline rows={3} />
                  <button className="edit-remove" onClick={() => removeItem("projects", i)}>{t("edit_remove")}</button>
                </div>
              ))}
              <button className="edit-add" onClick={() => addItem("projects", { title: "", note: "" })}>
                + {t("edit_add")}
              </button>
            </>
          )}
        </div>

        <div className="edit-drawer-foot">
          <button className="btn btn-ghost" onClick={onClose}>{t("edit_cancel")}</button>
          <button className="btn btn-accent" onClick={onClose}>{t("edit_save")}</button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, multiline, rows = 1 }) => (
  <div className="input-group">
    <label className="input-label">{label}</label>
    {multiline
      ? <textarea className="input" value={value || ""} placeholder={placeholder} rows={rows}
                  onChange={(e) => onChange(e.target.value)} style={{ resize: "vertical" }} />
      : <input className="input" value={value || ""} placeholder={placeholder}
               onChange={(e) => onChange(e.target.value)} />}
  </div>
);

const Workspace = ({ user, onLogout }) => {
  const { t, lang } = useCtxW(LangContext);
  const [tab, setTab] = useStateW("profile");
  const [improveOpen, setImproveOpen] = useStateW(false);
  const [improveSection, setImproveSection] = useStateW("any");
  const [editSection, setEditSection] = useStateW(null);
  const profileBase = lang === "zh" ? SAMPLE_PROFILE_ZH : SAMPLE_PROFILE_EN;
  const profile = { ...profileBase, name: user.name || profileBase.name, initials: user.initials || profileBase.initials, email: user.email || profileBase.email };

  const openImprove = (sec) => { setImproveSection(sec || "any"); setImproveOpen(true); };
  const openEdit = (sec) => setEditSection(sec);

  return (
    <div className="app-shell" data-screen-label="App">
      <header className="app-bar">
        <div className="app-bar-left">
          <div className="app-bar-brand"><Slime size={26} state="listening" />{t("brand")}</div>
          <nav className="app-nav">
            {[
              { id: "profile",  label: t("nav_profile") },
              { id: "match",    label: t("nav_match") },
              { id: "resume",   label: t("nav_resume") },
              { id: "grow",     label: t("nav_grow") },
              { id: "activity", label: t("nav_activity") },
            ].map((it) => (
              <button key={it.id} className={"app-nav-btn" + (tab === it.id ? " active" : "")} onClick={() => setTab(it.id)}>
                {it.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="app-bar-right">
          <LangToggle compact />
          <UserMenu user={profile} onSettings={() => setTab("settings")} onLogout={onLogout} />
        </div>
      </header>

      {tab === "profile"  && <ProfileDashboard profile={profile} onImprove={() => openImprove("any")} onSection={(sec) => openEdit(sec)} />}
      {tab === "match"    && <MatchScreen onJumpGrow={() => setTab("grow")} />}
      {tab === "resume"   && <ResumeScreen user={profile} profile={profile} onOpenMatch={() => setTab("match")} />}
      {tab === "grow"     && <GrowScreen />}
      {tab === "activity" && <ActivityScreen />}
      {tab === "settings" && <SettingsScreen user={profile} onLogout={onLogout} />}

      {improveOpen && <ImproveChatOverlay user={profile} initialSection={improveSection} onClose={() => setImproveOpen(false)} />}
      {editSection && (
        <EditDrawer section={editSection} profile={profile}
                    onClose={() => setEditSection(null)}
                    onChatInstead={() => { const s = editSection; setEditSection(null); openImprove(s === "summarySec" ? "summary" : s); }} />
      )}
    </div>
  );
};

window.Workspace = Workspace;
