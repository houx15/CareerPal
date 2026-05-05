"use client";

import { useEffect, useRef, useState } from "react";
import { LangToggle, useLang } from "../i18n/LangProvider";
import type { CopyKey } from "../i18n/copy";
import { Slime, type SlimeState } from "./Slime";

type KnowledgeKey = "basics" | "focus" | "exp" | "skills" | "goals";
type Knowledge = Record<KnowledgeKey, number>;

const KNOWLEDGE_TARGETS: Knowledge = { basics: 3, focus: 2, exp: 4, skills: 4, goals: 2 };

const STEP_DELTAS: Knowledge[] = [
  { basics: 2, focus: 0, exp: 0, skills: 0, goals: 0 },
  { basics: 0, focus: 2, exp: 0, skills: 0, goals: 1 },
  { basics: 1, focus: 0, exp: 3, skills: 2, goals: 0 },
];

interface OnboardingUser {
  name: string;
  initials: string;
  email?: string;
}

interface OnboardingProps {
  user: OnboardingUser;
  onDone: () => void;
  isLoading?: boolean;
}

type ChatMessage =
  | { role: "user"; body: string }
  | { role: "ai"; state?: SlimeState; body: string | null; options?: readonly string[]; final?: boolean };

const KNOWLEDGE_SECTIONS: Array<{ id: KnowledgeKey; icon: string; title: CopyKey; hint: CopyKey }> = [
  { id: "basics", icon: "◆", title: "onb_know_basics", hint: "onb_know_basics_hint" },
  { id: "focus", icon: "✦", title: "onb_know_focus", hint: "onb_know_focus_hint" },
  { id: "exp", icon: "▤", title: "onb_know_exp", hint: "onb_know_exp_hint" },
  { id: "skills", icon: "✜", title: "onb_know_skills", hint: "onb_know_skills_hint" },
  { id: "goals", icon: "◐", title: "onb_know_goals", hint: "onb_know_goals_hint" },
];

export function Onboarding({ user, onDone, isLoading = false }: OnboardingProps) {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [knowledge, setKnowledge] = useState<Knowledge>({ basics: 1, focus: 0, exp: 0, skills: 0, goals: 0 });
  const [attached, setAttached] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMessages([{ role: "ai", state: "speaking", body: t("onb_1").replace("{name}", user.name) }]);
    const promptTimer = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { role: "ai", state: "waiting", body: t("onb_2"), options: t("onb_opts").split("|") },
      ]);
    }, 900);

    return () => window.clearTimeout(promptTimer);
  }, [lang, t, user.name]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages]);

  function bumpKnowledge(delta: Knowledge) {
    setKnowledge((current) => {
      const next = { ...current };
      for (const key of Object.keys(delta) as KnowledgeKey[]) {
        next[key] = Math.min(KNOWLEDGE_TARGETS[key], current[key] + delta[key]);
      }
      return next;
    });
  }

  function sendUser(text: string) {
    const trimmed = text.trim();
    if (!trimmed && !attached) {
      return;
    }

    const body = attached ? [trimmed, `Attached: ${attached}`].filter(Boolean).join(" · ") : trimmed;
    const currentStep = step;
    setMessages((current) => [...current, { role: "user", body }, { role: "ai", state: "thinking", body: null }]);
    setInput("");

    if (attached) {
      bumpKnowledge({ basics: 1, focus: 0, exp: 2, skills: 2, goals: 0 });
      setAttached(null);
    }

    window.setTimeout(() => {
      bumpKnowledge(STEP_DELTAS[currentStep] ?? { basics: 0, focus: 0, exp: 0, skills: 0, goals: 0 });
      setMessages((current) => {
        const next = [...current];
        next[next.length - 1] =
          currentStep === 0
            ? { role: "ai", state: "speaking", body: t("onb_3") }
            : { role: "ai", state: "happy", body: t("onb_done"), final: true };
        return next;
      });
      setStep((current) => current + 1);
    }, 1100);
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setAttached(file.name);
    }
    event.target.value = "";
  }

  return (
    <main className="app-shell" data-screen-label="04 Onboarding">
      <header className="app-bar">
        <div className="app-bar-left">
          <div className="app-bar-brand">
            <Slime size={26} state="listening" />
            {t("brand")}
          </div>
        </div>
        <div className="app-bar-right">
          <LangToggle compact />
          <button className="btn btn-text" type="button" disabled={isLoading} onClick={onDone}>
            {t("onb_skip")}
          </button>
        </div>
      </header>
      <section className="onb-stage" aria-busy={isLoading}>
        <KnowledgePanel knowledge={knowledge} user={user} />
        <div className="chat-col" style={{ borderLeft: "1px solid var(--hair)", maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div className="chat-stream" ref={streamRef}>
            {messages.map((message, index) =>
              message.role === "user" ? (
                <div className="msg-row user" key={`${index}-${message.body}`}>
                  <div className="msg-avatar-user">{user.initials}</div>
                  <div className="msg-bubble">{message.body}</div>
                </div>
              ) : (
                <div className="msg-row" key={`${index}-${message.body ?? "thinking"}`}>
                  <div className="msg-avatar">
                    <Slime size={36} state={message.state ?? "listening"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="msg-meta">
                      <span>Pal</span>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{message.state === "thinking" ? t("thinking") : t("just_now")}</span>
                    </div>
                    <div className="msg-bubble">
                      {message.body || (
                        <span className="typing" aria-label={t("thinking")}>
                          <span />
                          <span />
                          <span />
                        </span>
                      )}
                    </div>
                    {message.options ? (
                      <div className="option-row">
                        {message.options.map((option) => (
                          <button className="opt-pill" key={option} type="button" onClick={() => sendUser(option)}>
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {message.final ? (
                      <div style={{ marginTop: 14 }}>
                        <button className="btn btn-accent" type="button" onClick={onDone}>
                          {t("onb_done_cta")}
                          <span style={{ fontSize: 14 }}>→</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
          <div className="composer">
            {attached ? (
              <div className="composer-attach">
                <span>Attached: {attached}</span>
                <button className="composer-attach-x" type="button" onClick={() => setAttached(null)}>
                  ×
                </button>
              </div>
            ) : null}
            <div className="composer-row">
              <input ref={fileRef} type="file" hidden onChange={onPickFile} accept=".pdf,.doc,.docx,.txt,.md" />
              <button
                className="composer-attach-btn"
                type="button"
                aria-label={t("onb_attach")}
                title={t("onb_attach")}
                onClick={() => fileRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M10.5 5L5.5 10C4.67 10.83 4.67 12.17 5.5 13C6.33 13.83 7.67 13.83 8.5 13L13.5 8C15.16 6.34 15.16 3.66 13.5 2C11.84 0.34 9.16 0.34 7.5 2L2.5 7"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.4"
                  />
                </svg>
              </button>
              <textarea
                className="composer-input"
                placeholder={t("onb_input_hint")}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendUser(input);
                  }
                }}
              />
              <button
                className="composer-send"
                type="button"
                aria-label="Send message"
                disabled={!input.trim() && !attached}
                onClick={() => sendUser(input)}
              >
                ↑
              </button>
            </div>
          </div>
          {isLoading ? (
            <p className="loading-status" role="status">
              Loading workspace...
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function KnowledgePanel({ knowledge, user }: { knowledge: Knowledge; user: OnboardingUser }) {
  const { t } = useLang();
  const totalKnown = KNOWLEDGE_SECTIONS.reduce((sum, section) => sum + knowledge[section.id], 0);
  const totalTarget = KNOWLEDGE_SECTIONS.reduce((sum, section) => sum + KNOWLEDGE_TARGETS[section.id], 0);
  const overall = Math.round((totalKnown / totalTarget) * 100);

  return (
    <aside className="onb-companion">
      <div className="know-card">
        <div className="know-head">
          <div className="know-avatar">{user.initials || "?"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="know-name">{user.name}</div>
            <div className="know-sub">{t("onb_know_sub")}</div>
          </div>
        </div>
        <div className="know-overall">
          <div className="know-overall-row">
            <span className="know-overall-label">{t("onb_know_overall")}</span>
            <span className="know-overall-pct">{overall}%</span>
          </div>
          <div className="know-overall-bar">
            <div className="know-overall-fill" style={{ width: `${overall}%` }} />
          </div>
        </div>
        <div className="know-list">
          {KNOWLEDGE_SECTIONS.map((section) => {
            const value = knowledge[section.id];
            const target = KNOWLEDGE_TARGETS[section.id];
            const percent = Math.round((value / target) * 100);
            const status = value === 0 ? "empty" : value >= target ? "full" : "partial";

            return (
              <div className={`know-item ${status}`} key={section.id}>
                <div className="know-item-head">
                  <span className="know-item-icon">{section.icon}</span>
                  <span className="know-item-title">{t(section.title)}</span>
                  <span className="know-item-pct">{status === "empty" ? "—" : status === "full" ? "✓" : `${value} / ${target}`}</span>
                </div>
                <div className="know-item-hint">{t(section.hint)}</div>
                <div className="know-item-bar">
                  <div className="know-item-fill" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
