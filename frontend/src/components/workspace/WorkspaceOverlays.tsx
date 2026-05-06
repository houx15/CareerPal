"use client";

import { useRef, useState } from "react";
import type { CopyKey } from "../../i18n/copy";
import { useLang } from "../../i18n/LangProvider";
import type { DemoProfile } from "../../fixtures/careerpalDemoData";
import type { EducationItem, ProfilePatch } from "../../lib/types";
import { Slime } from "../Slime";
import type { ProfileSectionId } from "./ProfileDashboard";

type ImproveSection = "any" | "basics" | "summary" | "experience" | "skills" | "projects" | "education";

const IMPROVE_SECTIONS: Array<{ id: ImproveSection; label: CopyKey }> = [
  { id: "any", label: "improve_any" },
  { id: "basics", label: "improve_chip_basics" },
  { id: "summary", label: "improve_chip_summary" },
  { id: "experience", label: "improve_chip_experience" },
  { id: "skills", label: "improve_chip_skills" },
  { id: "projects", label: "improve_chip_projects" },
  { id: "education", label: "improve_chip_education" },
];

export function ImproveChatOverlay({
  user,
  initialSection = "any",
  onClose,
}: {
  user: { initials: string };
  initialSection?: ImproveSection;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [section, setSection] = useState<ImproveSection>(initialSection);
  const [messages, setMessages] = useState([{ role: "ai", body: introFor(t, initialSection) }]);
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function switchSection(nextSection: ImproveSection) {
    if (nextSection === section) {
      return;
    }
    setSection(nextSection);
    setMessages((current) => [...current, { role: "ai", body: introFor(t, nextSection) }]);
  }

  function send() {
    const trimmed = input.trim();
    if (!trimmed && !attached) {
      return;
    }

    setMessages((current) => [...current, { role: "user", body: attached ? `${trimmed} · Attached: ${attached}` : trimmed }]);
    setInput("");
    setAttached(null);
  }

  return (
    <div className="overlay-back" onClick={onClose}>
      <section className="overlay-card" aria-label={t("improve_title")} onClick={(event) => event.stopPropagation()}>
        <div className="overlay-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Slime size={28} state="speaking" />
            <div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500 }}>Pal</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("improve_title")}</div>
            </div>
          </div>
          <button className="btn-text" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="improve-pick">
          <div className="improve-pick-label">{t("improve_pick")}</div>
          <div className="improve-chip-row">
            {IMPROVE_SECTIONS.map((item) => (
              <button
                className={`improve-chip${section === item.id ? " active" : ""}`}
                key={item.id}
                type="button"
                onClick={() => switchSection(item.id)}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-stream" style={{ padding: "16px 24px", flex: 1 }}>
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div className="msg-row user" key={`${index}-${message.body}`}>
                <div className="msg-avatar-user">{user.initials}</div>
                <div className="msg-bubble">{message.body}</div>
              </div>
            ) : (
              <div className="msg-row" key={`${index}-${message.body}`}>
                <div className="msg-avatar">
                  <Slime size={36} state="speaking" />
                </div>
                <div className="msg-bubble">{message.body}</div>
              </div>
            ),
          )}
        </div>

        <div className="composer">
          {attached ? <div className="composer-attach">Attached: {attached}</div> : null}
          <div className="composer-row">
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(event) => setAttached(event.target.files?.[0]?.name ?? null)}
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <button className="composer-attach-btn" type="button" aria-label={t("improve_attach")} onClick={() => fileRef.current?.click()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M10.5 5L5.5 10C4.67 10.83 4.67 12.17 5.5 13C6.33 13.83 7.67 13.83 8.5 13L13.5 8C15.16 6.34 15.16 3.66 13.5 2C11.84 0.34 9.16 0.34 7.5 2L2.5 7"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.4"
                />
              </svg>
            </button>
            <textarea className="composer-input" rows={1} placeholder={t("composer_ph")} value={input} onChange={(event) => setInput(event.target.value)} />
            <button className="composer-send" type="button" aria-label="Send message" disabled={!input.trim() && !attached} onClick={send}>
              ↑
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EditDrawer({
  section,
  profile,
  onClose,
  onChatInstead,
  onSave,
}: {
  section: ProfileSectionId;
  profile: DemoProfile;
  onClose: () => void;
  onChatInstead: (section: ProfileSectionId) => void;
  onSave: (payload: ProfilePatch) => Promise<void>;
}) {
  const { t } = useLang();
  const sectionName = t(sectionLabel(section));
  const [draft, setDraft] = useState(() => ({ ...profile }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const payload = profilePatchForSection(section, draft);
    setIsSaving(true);
    setError(null);

    try {
      await onSave(payload);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile changes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overlay-back" onClick={onClose}>
      <aside className="edit-drawer" aria-label={t("edit_title").replace("{section}", sectionName)} onClick={(event) => event.stopPropagation()}>
        <div className="edit-drawer-head">
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500 }}>{t("edit_title").replace("{section}", sectionName)}</div>
            <button className="btn-link" type="button" style={{ fontSize: 12.5, marginTop: 4 }} onClick={() => onChatInstead(section)}>
              <Slime size={14} state="listening" />
              {t("edit_via_chat")}
            </button>
          </div>
          <button className="btn-text" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="edit-drawer-body">
          {section === "basics" ? (
            <>
              <Field label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
              <Field label="Role" value={draft.role} onChange={(value) => setDraft((current) => ({ ...current, role: value }))} />
              <Field label="Location" value={draft.location} onChange={(value) => setDraft((current) => ({ ...current, location: value }))} />
              <Field label="Email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
              <Field label="Phone" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
            </>
          ) : null}
          {section === "summarySec" ? (
            <Field label="Summary" value={draft.summary} onChange={(value) => setDraft((current) => ({ ...current, summary: value }))} multiline rows={5} />
          ) : null}
          {section === "education" ? (
            <>
              {draft.education.items.map((education, index) => (
                <fieldset className="edit-card" key={index}>
                  <legend className="sr-only">Education {index + 1}</legend>
                  <Field label="School" value={education.school} onChange={(value) => updateEducationItem(index, "school", value)} />
                  <div className="edit-card-row">
                    <Field label="Degree" value={education.degree} onChange={(value) => updateEducationItem(index, "degree", value)} />
                    <Field label="Time period" value={education.time} onChange={(value) => updateEducationItem(index, "time", value)} placeholder="e.g. 2022 - present" />
                  </div>
                  <button className="edit-remove" type="button" aria-label={`Remove education ${index + 1}`} onClick={() => removeEducationItem(index)}>
                    Remove
                  </button>
                </fieldset>
              ))}
              <button className="edit-add" type="button" onClick={addEducationItem}>
                + Add another
              </button>
            </>
          ) : null}
          {section !== "basics" && section !== "summarySec" && section !== "education" ? (
            <>
              <Field label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
              <Field label="Role" value={draft.role} onChange={(value) => setDraft((current) => ({ ...current, role: value }))} />
              <Field label="Location" value={draft.location} onChange={(value) => setDraft((current) => ({ ...current, location: value }))} />
              <Field label="Email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
              <Field label="Phone" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
            </>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
        <div className="edit-drawer-foot">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t("edit_cancel")}
          </button>
          <button className="btn btn-accent" type="button" disabled={isSaving} onClick={save}>
            {isSaving ? "Saving..." : t("edit_save")}
          </button>
        </div>
      </aside>
    </div>
  );

  function updateEducationItem(index: number, key: keyof EducationItem, value: string) {
    setDraft((current) => ({
      ...current,
      education: {
        ...current.education,
        items: current.education.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
      },
    }));
  }

  function addEducationItem() {
    setDraft((current) => ({
      ...current,
      education: {
        ...current.education,
        items: [...current.education.items, { school: "", degree: "", time: "" }],
      },
    }));
  }

  function removeEducationItem(index: number) {
    setDraft((current) => ({
      ...current,
      education: {
        ...current.education,
        items: current.education.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 1,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      {multiline ? (
        <textarea className="input" value={value} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="input" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function profilePatchForSection(section: ProfileSectionId, profile: DemoProfile): ProfilePatch {
  if (section === "summarySec") {
    return { comment: profile.summary };
  }

  if (section === "basics") {
    return {
      name: profile.name,
      headline: profile.role,
      location: profile.location,
      contact_email: profile.email,
      phone: profile.phone,
    };
  }

  if (section === "education") {
    return { education: profile.education.items };
  }

  return {};
}

function introFor(t: (key: CopyKey) => string, section: ImproveSection) {
  if (section === "any") {
    return t("improve_intro_any");
  }
  return t("improve_intro_section").replace("{section}", t(sectionChipLabel(section)));
}

function sectionChipLabel(section: ImproveSection): CopyKey {
  return `improve_chip_${section}` as CopyKey;
}

function sectionLabel(section: ProfileSectionId): CopyKey {
  if (section === "summarySec") return "sec_summary";
  return `sec_${section}` as CopyKey;
}
