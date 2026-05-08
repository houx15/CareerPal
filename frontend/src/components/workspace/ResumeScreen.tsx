"use client";

import { useState } from "react";
import type { DemoProfile } from "../../fixtures/careerpalDemoData";
import type { GeneratedPage, PageStyleTemplate } from "../../lib/types";

type PageChatMessage = { role: "ai" | "user"; body: string };

const TEMPLATES: Array<{ id: PageStyleTemplate; label: string; color: string; border: string; dark?: boolean }> = [
  { id: "clean-professional", label: "Clean", color: "linear-gradient(135deg,#fff,#fafaf8)", border: "#e5e5e0" },
  { id: "modern-creative", label: "Modern", color: "linear-gradient(135deg,#efebff,#fff)", border: "#d8d0ff" },
  { id: "technical", label: "Terminal", color: "linear-gradient(135deg,#1a1a1f,#2a2a32)", border: "#3a3a42", dark: true },
];

export function ResumeScreen({
  profile,
  generatedPage,
  pageConversationMessages,
  isGeneratingPage = false,
  pageError,
  onGeneratePage,
  onCustomizePage,
  onOpenMatch,
}: {
  profile: DemoProfile;
  generatedPage?: GeneratedPage | null;
  pageConversationMessages?: PageChatMessage[];
  isGeneratingPage?: boolean;
  pageError?: string | null;
  onGeneratePage?: (styleTemplate: PageStyleTemplate) => void | Promise<void>;
  onCustomizePage?: (instruction: string) => void | Promise<void>;
  onOpenMatch: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<PageStyleTemplate>(generatedPage?.style_template ?? "clean-professional");
  const [customizing, setCustomizing] = useState(false);
  const [instruction, setInstruction] = useState("");

  async function generate() {
    await onGeneratePage?.(selectedTemplate);
  }

  async function customize() {
    const trimmed = instruction.trim();
    if (!trimmed) {
      return;
    }
    try {
      await onCustomizePage?.(trimmed);
      setInstruction("");
    } catch {
      // The parent owns the visible error state; keep the draft request intact.
    }
  }

  return (
    <div className="page-pad" data-screen-label="06 My resume">
      <div className="page-head">
        <h1>Your living resume site</h1>
        <p>Publish a clean profile page and keep tailored resume versions connected to your career database.</p>
      </div>
      <section className="resume-site">
        <div className="resume-site-head">
          <div>
            <div className="resume-site-title">careerpal.co/{profile.handle}</div>
            <div className="resume-site-sub">
              {generatedPage ? `Version ${generatedPage.version} · ${templateLabel(generatedPage.style_template)}` : "Choose a template and create your public page."}
            </div>
          </div>
          {generatedPage ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCustomizing(true)}>
                Edit page
              </button>
            </div>
          ) : null}
        </div>
        <div className="resume-site-stage">
          {TEMPLATES.map((template) => (
            <button
              className={`resume-tpl${selectedTemplate === template.id ? " selected" : ""}`}
              type="button"
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="resume-tpl-thumb" style={{ background: template.color, borderColor: template.border }}>
                <div className="tpl-thumb-bar" style={{ background: template.dark ? "#3a3a42" : "#e5e5e0" }} />
                <div className="tpl-thumb-block" style={{ background: template.dark ? "#5367F3" : "#1d1d1f", width: "55%" }} />
                <div className="tpl-thumb-block" style={{ background: template.dark ? "#5e577d" : "#a8a8a8", width: "75%" }} />
              </div>
              <div className="tpl-name">{template.label}</div>
            </button>
          ))}
        </div>
        {generatedPage ? (
          <div className="resume-site-preview" style={{ marginTop: 18 }}>
            <iframe
              title="Generated living resume preview"
              srcDoc={generatedPage.html_content}
              sandbox=""
              style={{ width: "100%", minHeight: 420, border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }}
            />
          </div>
        ) : null}
        {pageError ? <div className="form-error">{pageError}</div> : null}
        <div className="resume-site-foot">
          <div className="resume-site-url">careerpal.co/{profile.handle}</div>
          <button className="btn btn-accent" type="button" disabled={isGeneratingPage} onClick={generate}>
            {generatedPage ? "Regenerate page" : isGeneratingPage ? "Creating..." : "Create my page"}
          </button>
        </div>
      </section>
      {customizing ? (
        <div className="overlay-back" onClick={() => setCustomizing(false)}>
          <section className="overlay-card" aria-label="Customize page" onClick={(event) => event.stopPropagation()}>
            <div className="overlay-head">
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500 }}>Page assistant</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Tune the generated living resume site.</div>
              </div>
              <button className="btn-text" type="button" onClick={() => setCustomizing(false)}>
                ×
              </button>
            </div>
            <div className="chat-stream" style={{ padding: "16px 24px", flex: 1 }}>
              {(pageConversationMessages?.length ? pageConversationMessages : [{ role: "ai", body: "What should this page emphasize?" }]).map((message, index) => (
                <div className={`msg-row${message.role === "user" ? " user" : ""}`} key={`${message.body}-${index}`}>
                  <div className="msg-bubble">{message.body}</div>
                </div>
              ))}
            </div>
            <div className="composer">
              <div className="composer-row">
                <textarea
                  aria-label="Page customization request"
                  className="composer-input"
                  rows={1}
                  disabled={isGeneratingPage}
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="Make projects more prominent"
                />
                <button
                  className="composer-send"
                  type="button"
                  aria-label="Send page request"
                  disabled={isGeneratingPage || !instruction.trim()}
                  onClick={customize}
                >
                  ↑
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      <section style={{ marginTop: 32 }}>
        <div className="resume-section-head">
          <div>
            <div className="resume-section-title">Tailored resume versions</div>
            <div className="resume-section-sub">Versions created from saved job matches.</div>
          </div>
          <button className="btn btn-accent btn-sm" type="button" onClick={onOpenMatch}>
            + New version
          </button>
        </div>
      </section>
    </div>
  );
}

function templateLabel(styleTemplate: PageStyleTemplate): string {
  return TEMPLATES.find((template) => template.id === styleTemplate)?.label ?? styleTemplate;
}
