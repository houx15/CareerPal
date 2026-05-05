"use client";

import { sampleProfiles } from "../fixtures/careerpalDemoData";
import { LangToggle, useLang } from "../i18n/LangProvider";
import { Slime } from "./Slime";

interface IntroPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function IntroPage({ onGetStarted, onSignIn }: IntroPageProps) {
  const { t, lang } = useLang();
  const sample = sampleProfiles[lang];

  return (
    <div className="intro" data-screen-label="01 Intro">
      <nav className="intro-nav">
        <div className="intro-brand">
          <Slime size={32} state="listening" />
          {t("brand")}
        </div>
        <div className="intro-nav-links">
          <button className="nav-link" type="button">
            {t("nav_product")}
          </button>
          <button className="nav-link" type="button">
            {t("nav_pricing")}
          </button>
          <button className="nav-link" type="button">
            {t("nav_about")}
          </button>
        </div>
        <div className="intro-nav-right">
          <LangToggle compact />
          <button className="btn btn-text" type="button" onClick={onSignIn}>
            {t("sign_in")}
          </button>
          <button className="btn btn-primary" type="button" onClick={onGetStarted}>
            {t("get_started")}
            <span style={{ fontSize: 14 }}>→</span>
          </button>
        </div>
      </nav>

      <section className="intro-hero">
        <div className="intro-hero-left">
          <div className="intro-eyebrow">
            <span className="intro-eyebrow-tag">{t("intro_eyebrow")}</span>
          </div>
          <h1 className="intro-headline">
            {t("intro_headline_a")}
            <em>{t("intro_headline_em")}</em>
            {t("intro_headline_b")}
          </h1>
          <p className="intro-sub">{t("intro_sub")}</p>
          <div className="intro-cta-row">
            <button className="btn btn-accent btn-lg" type="button" onClick={onGetStarted}>
              {t("cta_start")}
              <span style={{ fontSize: 15 }}>→</span>
            </button>
            <button className="btn btn-ghost btn-lg" type="button">
              <span style={{ fontSize: 13, opacity: 0.7 }}>▶</span>
              {t("cta_demo")}
            </button>
          </div>
        </div>

        <div className="intro-hero-right">
          <div className="hero-stage">
            <div className="hero-device">
              <div className="hero-device-bar">
                <i />
                <i />
                <i />
              </div>
              <div>
                <div className="hero-device-name">{sample.name}</div>
                <div className="hero-device-meta">
                  {sample.role} · {sample.location}
                </div>
              </div>
              <div className="hero-device-divider" />
              {sample.experience.items.slice(0, 2).map((item) => (
                <dl className="hero-device-row" key={`${item.co}-${item.role}`}>
                  <dt>{item.time.split(" ")[0] || item.time}</dt>
                  <dd>
                    {item.role} @ {item.co}
                  </dd>
                </dl>
              ))}
              <div className="hero-device-divider" />
              {sample.skills.items.slice(0, 3).map((skill) => (
                <div key={skill.name}>
                  <div className="hero-skill-row">
                    <span>{skill.name}</span>
                    <span>{skill.years} yrs</span>
                  </div>
                  <div className="hero-device-bar-fill">
                    <span style={{ width: `${skill.level * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-chip hero-chip-1">
              <div className="hero-chip-icon">✦</div>
              <div>
                <span className="hero-chip-label">Match</span>
                <span className="hero-chip-value">92% · Senior PD</span>
              </div>
            </div>
            <div className="hero-chip hero-chip-2">
              <div className="hero-chip-icon">▤</div>
              <div>
                <span className="hero-chip-label">Drafted</span>
                <span className="hero-chip-value">14 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
