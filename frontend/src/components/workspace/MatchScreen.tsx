"use client";

import { useState } from "react";
import type { DemoProfile } from "../../fixtures/careerpalDemoData";

export function MatchScreen({ profile }: { profile: DemoProfile }) {
  const [jd, setJd] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const score = jd.toLowerCase().includes("react") ? 86 : 74;

  return (
    <div className="page-pad" data-screen-label="07 Match">
      <div className="page-head">
        <h1>Paste a JD</h1>
        <p>Compare a role against {profile.name}'s living profile and create a deterministic resume direction.</p>
      </div>
      <section className="panel">
        <textarea
          className="input"
          style={{ minHeight: 180, resize: "vertical" }}
          placeholder="Paste the job description or role you're aiming for"
          value={jd}
          onChange={(event) => setJd(event.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-accent" type="button" disabled={!jd.trim()} onClick={() => setAnalyzed(true)}>
            Analyze
          </button>
        </div>
      </section>
      {analyzed ? (
        <section className="match-result" style={{ marginTop: 24 }}>
          <div className="match-score">
            <div>Match score</div>
            <strong>{score}</strong>
          </div>
          <div className="profile-grid">
            <article className="profile-card">
              <div className="profile-card-title">Strengths</div>
              <p>Product thinking, structured communication, and evidence of shipping polished systems.</p>
            </article>
            <article className="profile-card">
              <div className="profile-card-title">Gaps</div>
              <p>Add more explicit React examples and internship-ready project outcomes.</p>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
