// Auth — Login (default) + multi-step SignUp + name intro + onboarding chat
const { useState: useStateAuth, useContext: useCtxAuth, useRef: useRefAuth, useEffect: useEffectAuth } = React;

/* ────────── LOGIN (default screen) ────────── */
const LoginScreen = ({ onBack, onLogin, onGoSignup }) => {
  const { t } = useCtxAuth(LangContext);
  const [email, setEmail] = useStateAuth("");
  const [pw, setPw] = useStateAuth("");
  const canSubmit = email.includes("@") && pw.length >= 1;

  return (
    <div className="center-stage" data-screen-label="02 Login">
      <button className="center-stage-back" onClick={onBack}>← {t("brand")}</button>
      <div style={{ position: "absolute", top: 24, right: 24 }}><LangToggle compact /></div>
      <div className="login-card">
        <div className="login-slime"><Slime size={72} state="listening" /></div>
        <h1 className="login-title">{t("welcome")}</h1>
        <p className="login-sub">{t("welcome_sub")}</p>
        <form className="login-form" onSubmit={(e) => { e.preventDefault(); if (canSubmit) onLogin({ email, isNew: false }); }}>
          <div className="input-group">
            <label className="input-label">{t("email")}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="input-group">
            <label className="input-label">{t("password")}</label>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
            <button type="button" className="btn-link" style={{ fontSize: 12.5 }}>{t("forgot_pw")}</button>
          </div>
          <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!canSubmit}>
            {t("login_btn")}<span style={{ fontSize: 14 }}>→</span>
          </button>
        </form>
        <div className="login-foot">
          <span style={{ color: "var(--ink-3)" }}>{t("no_account")} </span>
          <button className="btn-link" onClick={onGoSignup}>{t("sign_up_link")}</button>
        </div>
      </div>
    </div>
  );
};

/* ────────── SIGN UP — 1) verify email  2) set password  3) bind phone ────────── */
const SignUpScreen = ({ onBack, onComplete, onGoLogin }) => {
  const { t } = useCtxAuth(LangContext);
  const [step, setStep] = useStateAuth(0); // 0 email-verify, 1 password, 2 phone-bind, 3 done
  const [email, setEmail] = useStateAuth("");
  const [emailCode, setEmailCode] = useStateAuth("");
  const [emailSent, setEmailSent] = useStateAuth(false);
  const [pw, setPw] = useStateAuth("");
  const [pw2, setPw2] = useStateAuth("");
  const [phone, setPhone] = useStateAuth("");
  const [phoneCode, setPhoneCode] = useStateAuth("");
  const [phoneSent, setPhoneSent] = useStateAuth(false);

  const stepLabels = [t("signup_step_account"), t("signup_step_pw"), t("signup_step_phone")];
  const totalSteps = stepLabels.length;

  const emailValid = email.includes("@") && email.includes(".") && emailCode.length === 6;
  const pwValid = pw.length >= 8 && pw === pw2;
  const phoneValid = phone.replace(/\D/g, "").length >= 7 && phoneCode.length === 6;

  return (
    <div className="center-stage" data-screen-label="02 Sign Up">
      <button className="center-stage-back" onClick={step > 0 && step < 3 ? () => setStep(step - 1) : onBack}>← {step > 0 && step < 3 ? t("back") : t("brand")}</button>
      <div style={{ position: "absolute", top: 24, right: 24 }}><LangToggle compact /></div>

      <div className="login-card">
        <div className="login-slime"><Slime size={72} state="listening" /></div>

        {step < 3 && (
          <>
            <h1 className="login-title">{t("welcome_signup")}</h1>
            <p className="login-sub">{t("welcome_signup_sub")}</p>

            {/* Stepper */}
            <div className="signup-stepper">
              {stepLabels.map((label, i) => (
                <React.Fragment key={i}>
                  <div className={"signup-step" + (i === step ? " active" : "") + (i < step ? " done" : "")}>
                    <div className="signup-step-dot">{i < step ? "✓" : i + 1}</div>
                    <div className="signup-step-label">{label}</div>
                  </div>
                  {i < stepLabels.length - 1 && <div className={"signup-step-link" + (i < step ? " done" : "")}></div>}
                </React.Fragment>
              ))}
            </div>
          </>
        )}

        {/* STEP 0 — verify email */}
        {step === 0 && (
          <form className="login-form" onSubmit={(e) => { e.preventDefault(); if (emailValid) setStep(1); }}>
            <div className="signup-substep-title">{t("verify_email")}</div>
            <div className="signup-substep-sub">{t("verify_email_sub").replace("{email}", email || "—")}</div>
            <div className="input-group">
              <label className="input-label">{t("email")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus style={{ flex: 1 }} />
                <button type="button" className="btn btn-ghost"
                        disabled={!(email.includes("@") && email.includes(".")) || emailSent}
                        onClick={() => setEmailSent(true)}>
                  {emailSent ? t("code_sent") : t("send_code")}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">{t("code")}</label>
              <input className="input" type="text" maxLength={6} value={emailCode}
                     onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                     placeholder="123456" style={{ letterSpacing: "0.4em", fontSize: 17 }} />
              {emailSent && <button type="button" className="btn-link input-hint-action" onClick={() => setEmailCode("")}>{t("resend_code")}</button>}
            </div>
            <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!emailValid}>
              {t("next")}<span style={{ fontSize: 14 }}>→</span>
            </button>
          </form>
        )}

        {/* STEP 1 — set password */}
        {step === 1 && (
          <form className="login-form" onSubmit={(e) => { e.preventDefault(); if (pwValid) setStep(2); }}>
            <div className="signup-substep-title">{t("set_pw_title")}</div>
            <div className="signup-substep-sub">{t("set_pw_sub")}</div>
            <div className="input-group">
              <label className="input-label">{t("password")}</label>
              <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoFocus />
              <div className="input-hint">{t("pw_min")}</div>
            </div>
            <div className="input-group">
              <label className="input-label">{t("password")} ✓</label>
              <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
              {pw2.length > 0 && pw !== pw2 && <div className="input-hint" style={{ color: "#b3261e" }}>{t("pw_mismatch") || "—"}</div>}
            </div>
            <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!pwValid}>
              {t("next")}<span style={{ fontSize: 14 }}>→</span>
            </button>
          </form>
        )}

        {/* STEP 2 — bind phone */}
        {step === 2 && (
          <form className="login-form" onSubmit={(e) => { e.preventDefault(); if (phoneValid) setStep(3); }}>
            <div className="signup-substep-title">{t("bind_phone_title")}</div>
            <div className="signup-substep-sub">{t("bind_phone_sub")}</div>
            <div className="input-group">
              <label className="input-label">{t("phone")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+86 138 0000 0000" autoFocus style={{ flex: 1 }} />
                <button type="button" className="btn btn-ghost"
                        disabled={phone.replace(/\D/g, "").length < 7 || phoneSent}
                        onClick={() => setPhoneSent(true)}>
                  {phoneSent ? t("code_sent") : t("send_code")}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">{t("code")}</label>
              <input className="input" type="text" maxLength={6} value={phoneCode}
                     onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                     placeholder="123456" style={{ letterSpacing: "0.4em", fontSize: 17 }} />
              {phoneSent && <button type="button" className="btn-link input-hint-action" onClick={() => setPhoneCode("")}>{t("resend_code")}</button>}
            </div>
            <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!phoneValid}>
              {t("verify")}<span style={{ fontSize: 14 }}>→</span>
            </button>
          </form>
        )}

        {/* STEP 3 — done */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <Slime size={96} state="answering" />
            </div>
            <h1 className="login-title">{t("signup_done")}</h1>
            <p className="login-sub">{t("signup_done_sub")}</p>
            <button className="btn btn-accent btn-lg login-action" style={{ marginTop: 20 }}
                    onClick={() => onComplete({ email, isNew: true })}>
              {t("signup_continue")}<span style={{ fontSize: 14 }}>→</span>
            </button>
          </div>
        )}

        {step < 3 && (
          <>
            <div className="login-foot">
              <span style={{ color: "var(--ink-3)" }}>{t("have_account")} </span>
              <button className="btn-link" onClick={onGoLogin}>{t("sign_in_link")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ────────── NAME INTRO ────────── */
const NameIntro = ({ onSubmit }) => {
  const { t } = useCtxAuth(LangContext);
  const [name, setName] = useStateAuth("");
  return (
    <div className="center-stage" data-screen-label="03 Name">
      <div style={{ position: "absolute", top: 24, right: 24 }}><LangToggle compact /></div>
      <div className="greet-card">
        <Slime size={120} state="speaking" />
        <h1 className="greet-headline">{t("name_q")}</h1>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }}
              style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}>
          <input className="input" autoFocus placeholder={t("name_placeholder")}
                 value={name} onChange={(e) => setName(e.target.value)}
                 style={{ fontSize: 17, padding: "14px 16px", textAlign: "center" }} />
          <button type="submit" className="btn btn-accent btn-lg" disabled={!name.trim()} style={{ width: "100%", justifyContent: "center" }}>
            {t("name_continue")}<span style={{ fontSize: 15 }}>→</span>
          </button>
        </form>
      </div>
    </div>
  );
};

/* ────────── ONBOARDING CHAT ────────── */
// Knowledge model: each chat step fills in pieces of what Pal knows about you.
// Each section has a target = number of "facts" needed before it's full.
const KNOWLEDGE_TARGETS = { basics: 3, focus: 2, exp: 4, skills: 4, goals: 2 };

// Step → knowledge increment when the user answers
const STEP_DELTAS = [
  { basics: 2, focus: 0, exp: 0, skills: 0, goals: 0 },   // step 0: name / setup
  { basics: 0, focus: 2, exp: 0, skills: 0, goals: 1 },   // step 1: "what brings you here"
  { basics: 1, focus: 0, exp: 3, skills: 2, goals: 0 },   // step 2: most recent role
];

const Onboarding = ({ user, onDone }) => {
  const { t, lang } = useCtxAuth(LangContext);
  const [messages, setMessages] = useStateAuth([]);
  const [input, setInput] = useStateAuth("");
  const [step, setStep] = useStateAuth(0);
  const [know, setKnow] = useStateAuth({ basics: 1, focus: 0, exp: 0, skills: 0, goals: 0 }); // seed: name
  const [attached, setAttached] = useStateAuth(null);
  const streamRef = useRefAuth(null);
  const fileRef = useRefAuth(null);

  useEffectAuth(() => {
    setMessages([{ role: "ai", state: "speaking", body: t("onb_1").replace("{name}", user.name) }]);
    const id1 = setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", state: "waiting", body: t("onb_2"), options: t("onb_opts") }]);
    }, 900);
    return () => clearTimeout(id1);
  }, [lang]);

  useEffectAuth(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages]);

  const bumpKnowledge = (delta) => {
    setKnow((k) => {
      const next = { ...k };
      Object.keys(delta).forEach((key) => {
        next[key] = Math.min(KNOWLEDGE_TARGETS[key], (k[key] || 0) + delta[key]);
      });
      return next;
    });
  };

  const sendUser = (text) => {
    if (!text.trim() && !attached) return;
    const userBody = attached
      ? (text.trim() ? text + "  ·  📎 " + attached : "📎 " + attached)
      : text;
    setMessages((p) => [...p, { role: "user", body: userBody }, { role: "ai", state: "thinking", body: null }]);
    setInput("");
    // attaching a file gives a big knowledge boost across the board
    if (attached) bumpKnowledge({ basics: 1, exp: 2, skills: 2 });
    setAttached(null);

    const currentStep = step;
    setTimeout(() => {
      bumpKnowledge(STEP_DELTAS[currentStep] || {});
      setMessages((p) => {
        const next = [...p];
        if (currentStep === 0) {
          next[next.length - 1] = { role: "ai", state: "speaking", body: t("onb_3") };
        } else {
          next[next.length - 1] = { role: "ai", state: "happy", body: t("onb_done"), final: true };
        }
        return next;
      });
      setStep((s) => s + 1);
    }, 1100);
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setAttached(f.name);
    e.target.value = "";
  };

  return (
    <div className="app-shell" data-screen-label="04 Onboarding">
      <header className="app-bar">
        <div className="app-bar-left">
          <div className="app-bar-brand"><Slime size={26} state="listening" />{t("brand")}</div>
        </div>
        <div className="app-bar-right">
          <LangToggle compact />
          <button className="btn btn-text" onClick={onDone}>{t("onb_skip")}</button>
        </div>
      </header>
      <div className="onb-stage">
        {/* Side rail: structured "what I know about you" */}
        <KnowledgePanel know={know} targets={KNOWLEDGE_TARGETS} t={t} userName={user.name} userInitials={user.initials} />

        <div className="chat-col" style={{ borderLeft: "1px solid var(--hair)", maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div className="chat-stream" ref={streamRef}>
            {messages.map((m, i) => m.role === "user" ? (
              <div key={i} className="msg-row user">
                <div className="msg-avatar-user">{user.initials}</div>
                <div className="msg-bubble">{m.body}</div>
              </div>
            ) : (
              <div key={i} className="msg-row">
                <div className="msg-avatar"><Slime size={36} state={m.state || "listening"} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="msg-meta"><span>Pal</span><span style={{ opacity: 0.5 }}>·</span>
                    <span>{m.state === "thinking" ? t("thinking") : t("just_now")}</span></div>
                  <div className="msg-bubble">
                    {m.body || <span className="typing"><span></span><span></span><span></span></span>}
                  </div>
                  {m.options && (
                    <div className="option-row">
                      {m.options.map((o) => (
                        <button key={o} className="opt-pill" onClick={() => sendUser(o)}>{o}</button>
                      ))}
                    </div>
                  )}
                  {m.final && (
                    <div style={{ marginTop: 14 }}>
                      <button className="btn btn-accent" onClick={onDone}>
                        {t("onb_done_cta")}<span style={{ fontSize: 14 }}>→</span>
                      </button>
                    </div>
                  )}
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
              <button className="composer-attach-btn" title={t("onb_attach")} onClick={() => fileRef.current?.click()}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10.5 5L5.5 10C4.67 10.83 4.67 12.17 5.5 13C6.33 13.83 7.67 13.83 8.5 13L13.5 8C15.16 6.34 15.16 3.66 13.5 2C11.84 0.34 9.16 0.34 7.5 2L2.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              <textarea className="composer-input" placeholder={t("onb_input_hint")}
                        value={input} rows={1} onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUser(input); } }} />
              <button className="composer-send" disabled={!input.trim() && !attached} onClick={() => sendUser(input)}>↑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Side rail: shows what Pal knows so far. Each section animates as it fills. */
const KnowledgePanel = ({ know, targets, t, userName, userInitials }) => {
  const sections = [
    { id: "basics", icon: "◆" },
    { id: "focus",  icon: "✦" },
    { id: "exp",    icon: "▤" },
    { id: "skills", icon: "✜" },
    { id: "goals",  icon: "◐" },
  ];
  const totalKnown = sections.reduce((s, x) => s + (know[x.id] || 0), 0);
  const totalTarget = sections.reduce((s, x) => s + targets[x.id], 0);
  const overall = Math.round((totalKnown / totalTarget) * 100);

  return (
    <aside className="onb-companion">
      <div className="know-card">
        <div className="know-head">
          <div className="know-avatar">{userInitials || "?"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="know-name">{userName || "—"}</div>
            <div className="know-sub">{t("onb_know_sub")}</div>
          </div>
        </div>

        <div className="know-overall">
          <div className="know-overall-row">
            <span className="know-overall-label">{t("onb_know_overall")}</span>
            <span className="know-overall-pct">{overall}%</span>
          </div>
          <div className="know-overall-bar"><div className="know-overall-fill" style={{ width: overall + "%" }} /></div>
        </div>

        <div className="know-list">
          {sections.map((s) => {
            const v = know[s.id] || 0;
            const pct = Math.round((v / targets[s.id]) * 100);
            const status = v === 0 ? "empty" : v >= targets[s.id] ? "full" : "partial";
            return (
              <div key={s.id} className={"know-item " + status}>
                <div className="know-item-head">
                  <span className="know-item-icon">{s.icon}</span>
                  <span className="know-item-title">{t("onb_know_" + s.id)}</span>
                  <span className="know-item-pct">
                    {status === "empty" ? "—" : status === "full" ? "✓" : v + " / " + targets[s.id]}
                  </span>
                </div>
                <div className="know-item-hint">{t("onb_know_" + s.id + "_hint")}</div>
                <div className="know-item-bar"><div className="know-item-fill" style={{ width: pct + "%" }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

window.LoginScreen = LoginScreen;
window.SignUpScreen = SignUpScreen;
window.NameIntro = NameIntro;
window.Onboarding = Onboarding;
