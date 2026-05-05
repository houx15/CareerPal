"use client";

import { useState } from "react";
import type { DemoProfile } from "../../fixtures/careerpalDemoData";

export function ResumeScreen({ profile, onOpenMatch }: { profile: DemoProfile; onOpenMatch: () => void }) {
  const [siteCreated, setSiteCreated] = useState(false);

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
            <div className="resume-site-sub">{siteCreated ? "Site created and ready to edit." : "Choose a template and create your public page."}</div>
          </div>
          {siteCreated ? <button className="btn btn-accent btn-sm">Open site</button> : null}
        </div>
        <div className="resume-site-stage">
          {["Clean", "Modern", "Terminal", "Journal"].map((template) => (
            <button className="resume-tpl" type="button" key={template}>
              <div className="resume-tpl-thumb">
                <div className="tpl-thumb-bar" />
                <div className="tpl-thumb-block" />
                <div className="tpl-thumb-block" />
              </div>
              <div className="tpl-name">{template}</div>
            </button>
          ))}
        </div>
        <div className="resume-site-foot">
          <div className="resume-site-url">careerpal.co/{profile.handle}</div>
          <button className="btn btn-accent" type="button" onClick={() => setSiteCreated(true)}>
            Create site
          </button>
        </div>
      </section>
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
