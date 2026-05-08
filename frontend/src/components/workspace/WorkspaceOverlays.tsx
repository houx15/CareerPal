"use client";

import { useEffect, useRef, useState } from "react";
import type { CopyKey } from "../../i18n/copy";
import { useLang } from "../../i18n/LangProvider";
import type { DemoProfile } from "../../fixtures/careerpalDemoData";
import type { CertificateItem, EducationItem, ExperienceItem, ProfilePatch, ProjectItem, SkillItem, SkillProficiency } from "../../lib/types";
import { Slime } from "../Slime";
import type { ProfileSectionId } from "./ProfileDashboard";

type ImproveSection = "any" | "basics" | "summary" | "experience" | "skills" | "projects" | "education" | "certificates";
export type { ImproveSection };

export interface ImproveChatMessage {
  role: "ai" | "user";
  body: string;
}

export interface ImproveChatSendPayload {
  body: string;
  section: ImproveSection;
  attachmentName: string | null;
}

const IMPROVE_SECTIONS: Array<{ id: ImproveSection; label: CopyKey }> = [
  { id: "any", label: "improve_any" },
  { id: "basics", label: "improve_chip_basics" },
  { id: "summary", label: "improve_chip_summary" },
  { id: "experience", label: "improve_chip_experience" },
  { id: "skills", label: "improve_chip_skills" },
  { id: "projects", label: "improve_chip_projects" },
  { id: "education", label: "improve_chip_education" },
  { id: "certificates", label: "improve_chip_certificates" },
];

export function ImproveChatOverlay({
  user,
  initialSection = "any",
  conversationMessages,
  onSendMessage,
  onSectionChange,
  onClose,
}: {
  user: { initials: string };
  initialSection?: ImproveSection;
  conversationMessages?: ImproveChatMessage[];
  onSendMessage?: (payload: ImproveChatSendPayload) => void | Promise<void>;
  onSectionChange?: (section: ImproveSection) => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [section, setSection] = useState<ImproveSection>(initialSection);
  const [messages, setMessages] = useState<ImproveChatMessage[]>(() =>
    conversationMessages && conversationMessages.length > 0 ? conversationMessages : [{ role: "ai", body: introFor(t, initialSection) }],
  );
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSection(initialSection);
    setMessages(
      conversationMessages && conversationMessages.length > 0
        ? conversationMessages
        : [{ role: "ai", body: introFor(t, initialSection) }],
    );
  }, [conversationMessages, initialSection, t]);

  function switchSection(nextSection: ImproveSection) {
    if (nextSection === section) {
      return;
    }
    setSection(nextSection);
    setMessages((current) => [...current, { role: "ai", body: introFor(t, nextSection) }]);
    onSectionChange?.(nextSection);
  }

  function send() {
    const trimmed = input.trim();
    if (!trimmed && !attached) {
      return;
    }

    setMessages((current) => [...current, { role: "user", body: attached ? `${trimmed} · Attached: ${attached}` : trimmed }]);
    void onSendMessage?.({ body: trimmed, section, attachmentName: attached });
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
          {section === "experience" ? (
            <>
              {draft.experience.items.map((experience, index) => (
                <fieldset className="edit-card" key={index}>
                  <legend className="sr-only">Experience {index + 1}</legend>
                  <Field label="Company" value={experience.company} onChange={(value) => updateExperienceItem(index, "company", value)} />
                  <div className="edit-card-row">
                    <Field label="Role" value={experience.role} onChange={(value) => updateExperienceItem(index, "role", value)} />
                    <Field label="Time period" value={experience.time} onChange={(value) => updateExperienceItem(index, "time", value)} placeholder="e.g. 2022 - present" />
                  </div>
                  <Field
                    label="Description"
                    value={experience.description}
                    onChange={(value) => updateExperienceItem(index, "description", value)}
                    multiline
                    rows={3}
                  />
                  <Field
                    label="Achievements"
                    value={experience.achievements.join("\n")}
                    onChange={(value) => updateExperienceItem(index, "achievements", splitDraftLines(value))}
                    multiline
                    rows={3}
                  />
                  <button className="edit-remove" type="button" aria-label={`Remove experience ${index + 1}`} onClick={() => removeExperienceItem(index)}>
                    Remove
                  </button>
                </fieldset>
              ))}
              <button className="edit-add" type="button" onClick={addExperienceItem}>
                + Add another
              </button>
            </>
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
          {section === "skills" ? (
            <>
              {draft.skills.items.map((skill, index) => (
                <fieldset className="edit-card" key={index}>
                  <legend className="sr-only">Skill {index + 1}</legend>
                  <Field label="Skill name" value={skill.name} onChange={(value) => updateSkillItem(index, "name", value)} />
                  <div className="edit-card-row">
                    <Field label="Category" value={skill.category} onChange={(value) => updateSkillItem(index, "category", value)} />
                    <ProficiencyField value={skill.proficiency} onChange={(value) => updateSkillItem(index, "proficiency", value)} />
                  </div>
                  <Field label="Comment" value={skill.comment ?? ""} onChange={(value) => updateSkillItem(index, "comment", value)} multiline rows={2} />
                  <button className="edit-remove" type="button" aria-label={`Remove skill ${index + 1}`} onClick={() => removeSkillItem(index)}>
                    Remove
                  </button>
                </fieldset>
              ))}
              <button className="edit-add" type="button" onClick={addSkillItem}>
                + Add another
              </button>
            </>
          ) : null}
          {section === "projects" ? (
            <>
              {draft.projects.items.map((project, index) => (
                <fieldset className="edit-card" key={index}>
                  <legend className="sr-only">Project {index + 1}</legend>
                  <Field label="Project name" value={project.name} onChange={(value) => updateProjectItem(index, "name", value)} />
                  <Field label="Link" value={project.link ?? ""} onChange={(value) => updateProjectItem(index, "link", value)} placeholder="https://example.com" />
                  <Field
                    label="Description"
                    value={project.description}
                    onChange={(value) => updateProjectItem(index, "description", value)}
                    multiline
                    rows={3}
                  />
                  <Field
                    label="Tech stack"
                    value={project.tech_stack.join("\n")}
                    onChange={(value) => updateProjectItem(index, "tech_stack", splitDraftLines(value))}
                    multiline
                    rows={3}
                  />
                  <Field
                    label="Achievements"
                    value={project.achievements.join("\n")}
                    onChange={(value) => updateProjectItem(index, "achievements", splitDraftLines(value))}
                    multiline
                    rows={3}
                  />
                  <Field
                    label="Comment"
                    value={project.comment ?? ""}
                    onChange={(value) => updateProjectItem(index, "comment", value)}
                    multiline
                    rows={2}
                  />
                  <button className="edit-remove" type="button" aria-label={`Remove project ${index + 1}`} onClick={() => removeProjectItem(index)}>
                    Remove
                  </button>
                </fieldset>
              ))}
              <button className="edit-add" type="button" onClick={addProjectItem}>
                + Add another
              </button>
            </>
          ) : null}
          {section === "certificates" ? (
            <>
              {draft.certificates.items.map((certificate, index) => (
                <fieldset className="edit-card" key={index}>
                  <legend className="sr-only">Certificate {index + 1}</legend>
                  <Field label="Certificate name" value={certificate.name} onChange={(value) => updateCertificateItem(index, "name", value)} />
                  <div className="edit-card-row">
                    <Field label="Issuer" value={certificate.issuer} onChange={(value) => updateCertificateItem(index, "issuer", value)} />
                    <Field label="Date" value={certificate.date} onChange={(value) => updateCertificateItem(index, "date", value)} />
                  </div>
                  <Field label="Comment" value={certificate.comment ?? ""} onChange={(value) => updateCertificateItem(index, "comment", value)} multiline rows={2} />
                  <button className="edit-remove" type="button" aria-label={`Remove certificate ${index + 1}`} onClick={() => removeCertificateItem(index)}>
                    Remove
                  </button>
                </fieldset>
              ))}
              <button className="edit-add" type="button" onClick={addCertificateItem}>
                + Add another
              </button>
            </>
          ) : null}
          {section !== "basics" &&
          section !== "summarySec" &&
          section !== "experience" &&
          section !== "education" &&
          section !== "skills" &&
          section !== "projects" &&
          section !== "certificates" ? (
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

  function updateExperienceItem<K extends keyof ExperienceItem>(index: number, key: K, value: ExperienceItem[K]) {
    setDraft((current) => ({
      ...current,
      experience: {
        ...current.experience,
        items: current.experience.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
      },
    }));
  }

  function updateProjectItem<K extends keyof ProjectItem>(index: number, key: K, value: ProjectItem[K]) {
    setDraft((current) => ({
      ...current,
      projects: {
        ...current.projects,
        items: current.projects.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
      },
    }));
  }

  function updateSkillItem<K extends keyof SkillItem>(index: number, key: K, value: SkillItem[K]) {
    setDraft((current) => ({
      ...current,
      skills: {
        ...current.skills,
        items: current.skills.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
      },
    }));
  }

  function updateCertificateItem<K extends keyof CertificateItem>(index: number, key: K, value: CertificateItem[K]) {
    setDraft((current) => ({
      ...current,
      certificates: {
        ...current.certificates,
        items: current.certificates.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
      },
    }));
  }

  function addExperienceItem() {
    setDraft((current) => ({
      ...current,
      experience: {
        ...current.experience,
        items: [...current.experience.items, { company: "", role: "", time: "", description: "", achievements: [] }],
      },
    }));
  }

  function removeExperienceItem(index: number) {
    setDraft((current) => ({
      ...current,
      experience: {
        ...current.experience,
        items: current.experience.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function addProjectItem() {
    setDraft((current) => ({
      ...current,
      projects: {
        ...current.projects,
        items: [...current.projects.items, { name: "", description: "", tech_stack: [], achievements: [], link: null, comment: null }],
      },
    }));
  }

  function removeProjectItem(index: number) {
    setDraft((current) => ({
      ...current,
      projects: {
        ...current.projects,
        items: current.projects.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function addSkillItem() {
    setDraft((current) => ({
      ...current,
      skills: {
        ...current.skills,
        items: [...current.skills.items, { name: "", category: "", proficiency: "intermediate", comment: null, years: 0, level: 0.55 }],
      },
    }));
  }

  function removeSkillItem(index: number) {
    setDraft((current) => ({
      ...current,
      skills: {
        ...current.skills,
        items: current.skills.items.filter((_, itemIndex) => itemIndex !== index),
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

  function addCertificateItem() {
    setDraft((current) => ({
      ...current,
      certificates: {
        ...current.certificates,
        items: [...current.certificates.items, { name: "", issuer: "", date: "", comment: null }],
      },
    }));
  }

  function removeCertificateItem(index: number) {
    setDraft((current) => ({
      ...current,
      certificates: {
        ...current.certificates,
        items: current.certificates.items.filter((_, itemIndex) => itemIndex !== index),
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

function ProficiencyField({ value, onChange }: { value: SkillProficiency; onChange: (value: SkillProficiency) => void }) {
  return (
    <label className="input-group">
      <span className="input-label">Proficiency</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value as SkillProficiency)}>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
        <option value="expert">Expert</option>
      </select>
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

  if (section === "experience") {
    return {
      experience: profile.experience.items.map((item) => ({
        company: item.company,
        role: item.role,
        time: item.time,
        description: item.description,
        achievements: item.achievements.map((achievement) => achievement.trim()).filter(Boolean),
        ...(item.comment === undefined ? {} : { comment: item.comment }),
      })),
    };
  }

  if (section === "projects") {
    return { projects: profile.projects.items.map(normalizeProjectItem) };
  }

  if (section === "skills") {
    return { skills: profile.skills.items.map(normalizeSkillItem) };
  }

  if (section === "certificates") {
    return { certificates: profile.certificates.items.map(normalizeCertificateItem) };
  }

  return {};
}

function normalizeProjectItem(project: ProjectItem): ProjectItem {
  return {
    name: project.name.trim(),
    description: project.description.trim(),
    tech_stack: project.tech_stack.map((item) => item.trim()).filter(Boolean),
    achievements: project.achievements.map((item) => item.trim()).filter(Boolean),
    link: project.link?.trim() || null,
    comment: project.comment?.trim() || null,
  };
}

function normalizeSkillItem(skill: SkillItem): SkillItem {
  return {
    name: skill.name.trim(),
    category: skill.category.trim(),
    proficiency: skill.proficiency,
    comment: skill.comment?.trim() || null,
  };
}

function normalizeCertificateItem(certificate: CertificateItem): CertificateItem {
  return {
    name: certificate.name.trim(),
    issuer: certificate.issuer.trim(),
    date: certificate.date.trim(),
    comment: certificate.comment?.trim() || null,
  };
}

function splitDraftLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .filter((line) => line.trim());
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
