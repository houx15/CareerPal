"use client";

import { useState } from "react";
import type { DemoProfile } from "../../fixtures/careerpalDemoData";
import type { JobMatchAnalysis } from "../../lib/types";
import { Slime } from "../Slime";

export function MatchScreen({
  profile,
  jobMatches = [],
  isAnalyzingJobMatch = false,
  jobMatchError,
  onCreateJobMatch,
  onOpenJobMatch,
}: {
  profile: DemoProfile;
  jobMatches?: JobMatchAnalysis[];
  isAnalyzingJobMatch?: boolean;
  jobMatchError?: string | null;
  onCreateJobMatch?: (jobDescription: string) => Promise<JobMatchAnalysis>;
  onOpenJobMatch?: (id: string) => Promise<JobMatchAnalysis>;
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

  const error = localError ?? jobMatchError;
  const visibleMatches = showAllHistory ? jobMatches : jobMatches.slice(0, 4);

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
                <div className="history-row-meta">Score {match.score}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {result ? <MatchResult analysis={result} onBack={() => setResult(null)} /> : null}
    </div>
  );
}

function MatchResult({ analysis, onBack }: { analysis: JobMatchAnalysis; onBack: () => void }) {
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
          <div className="profile-card-title">Gaps</div>
          <ul className="match-list">
            {analysis.gaps.map((item) => (
              <li key={item}>{item}</li>
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

function matchTitle(match: JobMatchAnalysis): string {
  if (match.role && match.company) {
    return `${match.role} at ${match.company}`;
  }
  return match.role ?? match.company ?? "Saved match";
}
