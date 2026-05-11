"use client";

import { useState } from "react";
import type { DemoProfile } from "../../fixtures/careerpalDemoData";
import type { GeneratedPage, JobMatchAnalysis, PageStyleTemplate } from "../../lib/types";
import { Slime } from "../Slime";

export function MatchScreen({
  profile,
  jobMatches = [],
  isAnalyzingJobMatch = false,
  isSavingTargetedVersion = false,
  jobMatchError,
  onCreateJobMatch,
  onOpenJobMatch,
  onSaveTargetedVersion,
  onJumpGrow,
}: {
  profile: DemoProfile;
  jobMatches?: JobMatchAnalysis[];
  isAnalyzingJobMatch?: boolean;
  isSavingTargetedVersion?: boolean;
  jobMatchError?: string | null;
  onCreateJobMatch?: (jobDescription: string) => Promise<JobMatchAnalysis>;
  onOpenJobMatch?: (id: string) => Promise<JobMatchAnalysis>;
  onSaveTargetedVersion?: (id: string, styleTemplate: PageStyleTemplate) => Promise<GeneratedPage>;
  onJumpGrow?: () => void;
}) {
  const [jd, setJd] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [result, setResult] = useState<JobMatchAnalysis | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  async function analyze() {
    if (!jd.trim() || !onCreateJobMatch) {
      return;
    }
    setLocalError(null);
    try {
      setResult(await onCreateJobMatch(jd.trim()));
    } catch (caught) {
      setResult(null);
      setLocalError(caught instanceof Error ? caught.message : "Could not analyze this JD.");
    }
  }

  async function openHistory(id: string) {
    if (!onOpenJobMatch) {
      return;
    }
    setLocalError(null);
    try {
      setResult(await onOpenJobMatch(id));
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Could not open this match.");
    }
  }

  async function saveTargetedVersion(id: string, styleTemplate: PageStyleTemplate): Promise<GeneratedPage> {
    if (!onSaveTargetedVersion) {
      throw new Error("Targeted version saving is not available.");
    }
    const page = await onSaveTargetedVersion(id, styleTemplate);
    setResult((current) =>
      current && current.id === id ? { ...current, saved_page_id: page.id, saved_page_version: page.version } : current,
    );
    return page;
  }

  const error = localError ?? jobMatchError;
  const visibleMatches = showAllHistory ? jobMatches : jobMatches.slice(0, 4);

  if (result) {
    return (
      <div className="page-pad" data-screen-label="07 Match · Result">
        <MatchResult
          analysis={result}
          isSavingTargetedVersion={isSavingTargetedVersion}
          onBack={() => setResult(null)}
          onJumpGrow={onJumpGrow}
          onSaveTargetedVersion={onSaveTargetedVersion ? saveTargetedVersion : undefined}
        />
      </div>
    );
  }

  return (
    <div className="page-pad" data-screen-label="07 Match">
      <div className="page-head">
        <h1>Paste a JD</h1>
        <p>Compare a role against {profile.name}'s living profile and create a deterministic resume direction.</p>
      </div>
      <section className="match-entry-card">
        <div className="match-entry-slime">
          <Slime size={48} state={isAnalyzingJobMatch ? "thinking" : "listening"} />
        </div>
        <div className="match-entry-prompt">Paste a JD or describe the role</div>
        <textarea
          aria-label="Job description"
          className="match-entry-textarea"
          placeholder="Paste the job description or role you're aiming for"
          value={jd}
          onChange={(event) => setJd(event.target.value)}
        />
        {error ? <div className="form-error">{error}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-accent" type="button" disabled={!jd.trim() || isAnalyzingJobMatch || !onCreateJobMatch} onClick={analyze}>
            {isAnalyzingJobMatch ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </section>
      {jobMatches.length > 0 ? (
        <section className="match-history-quiet">
          <div className="match-history-quiet-head">
            <span>Recent matches</span>
            {jobMatches.length > 4 ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowAllHistory((current) => !current)}>
                {showAllHistory ? "Show fewer" : "Show all matches"}
              </button>
            ) : null}
          </div>
          <div className="history-list">
            {visibleMatches.map((match) => (
              <button className="history-row-btn" type="button" key={match.id} onClick={() => openHistory(match.id)}>
                <div className="history-row-main">{matchTitle(match)}</div>
                <div className="history-row-meta">
                  Score {match.score}
                  {match.saved_page_version ? ` · Saved version ${match.saved_page_version}` : ""}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MatchResult({
  analysis,
  isSavingTargetedVersion,
  onBack,
  onJumpGrow,
  onSaveTargetedVersion,
}: {
  analysis: JobMatchAnalysis;
  isSavingTargetedVersion?: boolean;
  onBack: () => void;
  onJumpGrow?: () => void;
  onSaveTargetedVersion?: (id: string, styleTemplate: PageStyleTemplate) => Promise<GeneratedPage>;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(analysis.saved_page_version ?? null);

  async function saveTargetedVersion() {
    if (!onSaveTargetedVersion) {
      return;
    }
    setSaveError(null);
    try {
      const page = await onSaveTargetedVersion(analysis.id, "technical");
      setSavedVersion(page.version);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save targeted version.");
    }
  }

  return (
    <section className="match-result" style={{ marginTop: 24 }}>
      <div className="match-result-head">
        <button className="btn btn-ghost btn-sm match-back" type="button" onClick={onBack}>
          Back
        </button>
        <div>
          <h2>{matchTitle(analysis)}</h2>
          <p>Saved match analysis from your current profile.</p>
        </div>
      </div>
      <div className="match-result-grid">
        <article className="panel match-score-card">
          <div className="match-ring">
            <div className="match-ring-num">{analysis.score}</div>
          </div>
          <div>
            <div className="profile-card-title">Match score</div>
            <p>Use this analysis to tailor the resume direction.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button
                className="btn btn-accent btn-sm"
                type="button"
                disabled={isSavingTargetedVersion || !onSaveTargetedVersion}
                onClick={saveTargetedVersion}
              >
                {isSavingTargetedVersion ? "Saving..." : "Save targeted version"}
              </button>
              {savedVersion ? <span className="history-row-meta">Saved as version {savedVersion}</span> : null}
            </div>
            {saveError ? <div className="form-error">{saveError}</div> : null}
          </div>
        </article>
        <article className="panel">
          <div className="profile-card-title">Match radar</div>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <MatchRadar score={analysis.score} />
          </div>
          <div className="radar-legend">
            <div>
              <span className="dot" style={{ background: "#5367F3" }} />
              You
            </div>
            <div>
              <span className="dot" style={{ background: "rgba(83,103,243,0.25)" }} />
              Role bar
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="profile-card-title">Strengths</div>
          <ul className="match-list">
            {analysis.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <div className="profile-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>Gaps</span>
            {onJumpGrow ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={onJumpGrow}>
                Open Grow
              </button>
            ) : null}
          </div>
          <ul className="match-list">
            {analysis.gaps.map((item) => (
              <li key={item}>
                <span>{item}</span>
                {onJumpGrow ? (
                  <button className="btn-link" type="button" onClick={onJumpGrow}>
                    Open Grow
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <div className="profile-card-title">Suggestions</div>
          <ul className="match-list">
            {analysis.suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function MatchRadar({ score }: { score: number }) {
  const dims = ["Skills", "Impact", "Domain", "Tools", "Clarity", "Growth"];
  const base = Math.max(0.2, Math.min(score / 100, 0.96));
  const values = dims.map((_, index) => Math.max(0.25, Math.min(0.98, base - (index % 3) * 0.08 + (index === 1 ? 0.06 : 0))));
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;
  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / dims.length - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * value, cy + Math.sin(angle) * radius * value];
  };
  const polygon = (items: number[]) => items.map((value, index) => point(index, value).join(",")).join(" ");

  return (
    <svg aria-label="Match radar" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon key={ring} points={polygon(Array(dims.length).fill(ring))} fill="none" stroke="rgba(83,103,243,0.12)" />
      ))}
      {dims.map((dim, index) => {
        const [x, y] = point(index, 1);
        const [labelX, labelY] = point(index, 1.2);
        return (
          <g key={dim}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(83,103,243,0.12)" />
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#4a4a52">
              {dim}
            </text>
          </g>
        );
      })}
      <polygon points={polygon(values)} fill="rgba(83,103,243,0.20)" stroke="#5367F3" strokeWidth="2" strokeLinejoin="round" />
      {values.map((value, index) => {
        const [x, y] = point(index, value);
        return <circle key={index} cx={x} cy={y} r="3.5" fill="#5367F3" />;
      })}
    </svg>
  );
}

function matchTitle(match: JobMatchAnalysis): string {
  if (match.role && match.company) {
    return `${match.role} at ${match.company}`;
  }
  return match.role ?? match.company ?? "Saved match";
}
