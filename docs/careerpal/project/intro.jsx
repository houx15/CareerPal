// Intro / landing page — CN-native, no fake trust row
const IntroPage = ({ onGetStarted, onSignIn }) => {
  const { t, lang } = React.useContext(LangContext);
  const sample = lang === "zh" ? SAMPLE_PROFILE_ZH : SAMPLE_PROFILE_EN;
  return (
    <div className="intro" data-screen-label="01 Intro">
      <nav className="intro-nav">
        <div className="intro-brand">
          <Slime size={32} state="listening" />
          {t("brand")}
        </div>
        <div className="intro-nav-links">
          <button className="nav-link">{t("nav_product")}</button>
          <button className="nav-link">{t("nav_pricing")}</button>
          <button className="nav-link">{t("nav_about")}</button>
        </div>
        <div className="intro-nav-right">
          <LangToggle compact />
          <button className="btn btn-text" onClick={onSignIn}>{t("sign_in")}</button>
          <button className="btn btn-primary" onClick={onGetStarted}>
            {t("get_started")}<span style={{ fontSize: 14 }}>→</span>
          </button>
        </div>
      </nav>

      <section className="intro-hero">
        <div className="intro-hero-left">
          <div className="intro-eyebrow">
            <span className="intro-eyebrow-tag">{t("intro_eyebrow")}</span>
          </div>
          <h1 className="intro-headline">
            {t("intro_headline_a")}<em>{t("intro_headline_em")}</em>{t("intro_headline_b")}
          </h1>
          <p className="intro-sub">{t("intro_sub")}</p>
          <div className="intro-cta-row">
            <button className="btn btn-accent btn-lg" onClick={onGetStarted}>
              {t("cta_start")}<span style={{ fontSize: 15 }}>→</span>
            </button>
            <button className="btn btn-ghost btn-lg">
              <span style={{ fontSize: 13, opacity: 0.7 }}>▶</span>{t("cta_demo")}
            </button>
          </div>
        </div>

        <div className="intro-hero-right">
          <div className="hero-stage">
            <div className="hero-device">
              <div className="hero-device-bar"><i></i><i></i><i></i></div>
              <div>
                <div className="hero-device-name">{sample.name}</div>
                <div className="hero-device-meta">{sample.role} · {sample.location}</div>
              </div>
              <div className="hero-device-divider"></div>
              {sample.experience.items.slice(0, 2).map((x, i) => (
                <dl className="hero-device-row" key={i}>
                  <dt>{x.time.split(" ")[0] || x.time}</dt>
                  <dd>{x.role} @ {x.co}</dd>
                </dl>
              ))}
              <div className="hero-device-divider"></div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
                {lang === "zh" ? "核心技能" : "Top skills"}
              </div>
              {sample.skills.items.slice(0, 3).map((s, i) => (
                <React.Fragment key={i}>
                  <div className="hero-skill-row"><span>{s.name}</span><span>{s.years}{lang === "zh" ? " 年" : " yrs"}</span></div>
                  <div className="hero-device-bar-fill"><span style={{ width: (s.level * 100) + '%' }}></span></div>
                </React.Fragment>
              ))}
            </div>
            <div className="hero-chip hero-chip-1">
              <div className="hero-chip-icon">✦</div>
              <div>
                <span className="hero-chip-label">{lang === "zh" ? "匹配度" : "Match"}</span>
                <span className="hero-chip-value">{lang === "zh" ? "88% · MiniMax 设计师" : "92% · Senior PD"}</span>
              </div>
            </div>
            <div className="hero-chip hero-chip-2">
              <div className="hero-chip-icon">▤</div>
              <div>
                <span className="hero-chip-label">{lang === "zh" ? "对话起草" : "Drafted"}</span>
                <span className="hero-chip-value">{lang === "zh" ? "14 分钟" : "14 minutes"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
window.IntroPage = IntroPage;
