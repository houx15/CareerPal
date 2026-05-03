// Match — entry (chat-style input + small history) → result (full radar + analysis)
const { useState: useStateM, useContext: useCtxM } = React;

/* RadarChart — reused */
const _RadarChart = ({ dims, values, size = 240 }) => {
  const cx = size / 2, cy = size / 2, r = size / 2 - 24;
  const n = dims.length;
  const point = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const polyPts = (vs) => vs.map((v, i) => point(i, v).join(",")).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((rv, i) => (
        <polygon key={i} points={polyPts(Array(n).fill(rv))}
                 fill="none" stroke="rgba(83,103,243,0.10)" strokeWidth="1" />
      ))}
      {dims.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(83,103,243,0.10)" strokeWidth="1" />;
      })}
      <polygon points={polyPts(values)} fill="rgba(83,103,243,0.20)" stroke="#5367F3" strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const [x, y] = point(i, v);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#5367F3" />;
      })}
      {dims.map((d, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fontWeight="500" fill="#4a4a52">{d}</text>
        );
      })}
    </svg>
  );
};

/* Entry view — clean chat-like input + small history */
const MatchEntry = ({ jd, setJd, onAnalyze, onPickHistory }) => {
  const { t, lang } = useCtxM(LangContext);
  const history = lang === "zh" ? MATCH_HISTORY_ZH : MATCH_HISTORY_EN;
  const visibleHistory = history.slice(0, 3);
  const [showAll, setShowAll] = useStateM(false);

  return (
    <div className="page-pad" data-screen-label="06 Match · Entry">
      <div className="page-head">
        <h1>{t("match_title")}</h1>
        <p>{t("match_sub")}</p>
      </div>

      {/* Big chat-style input — primary affordance */}
      <div className="match-entry-card">
        <div className="match-entry-slime"><Slime size={56} state="listening" /></div>
        <div className="match-entry-prompt">{t("match_entry_title")}</div>
        <textarea className="match-entry-textarea" placeholder={t("match_entry_ph")}
                  value={jd} onChange={(e) => setJd(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-accent btn-lg" onClick={onAnalyze} disabled={!jd.trim()}>
            {t("match_analyze")}<span style={{ fontSize: 14 }}>→</span>
          </button>
        </div>
      </div>

      {/* Quiet history below */}
      <div className="match-history-quiet">
        <div className="match-history-quiet-head">
          <span>{t("match_history")}</span>
          {history.length > 3 && !showAll && (
            <button className="btn-link" onClick={() => setShowAll(true)}>{t("match_view_more")} →</button>
          )}
        </div>
        <div className="history-list">
          {(showAll ? history : visibleHistory).map((h) => (
            <button key={h.id} className="history-row history-row-btn" onClick={() => onPickHistory(h)}>
              <div className="history-score">{h.score}</div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontWeight: 500, color: "var(--ink)" }}>{h.role} · {h.co}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
                  {h.date}{h.saved ? " · " : ""}
                  {h.saved && <span style={{ color: "var(--accent)" }}>📄 {h.branch}</span>}
                </div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 16 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* Result view — full analysis page */
const MatchResult = ({ context, onBack, onJumpGrow }) => {
  const { t, lang } = useCtxM(LangContext);
  const dims = lang === "zh" ? RADAR_DIMS_ZH : RADAR_DIMS_EN;
  const yourValues = context.your || [0.92, 0.45, 0.85, 0.6, 0.7, 0.88];
  const score = context.score || 82;
  const role = context.role || (lang === "zh" ? "AI 产品设计师" : "Senior PD, AI");
  const co = context.co || (lang === "zh" ? "MiniMax" : "Anthropic");

  const strengths = lang === "zh"
    ? ["8 年产品设计经验,资历充分", "在字节主导过 AI 重设计", "跨职能协作经验丰富"]
    : ["8 years of product design", "Led AI redesign at top tier", "Strong cross-functional reps"];
  const gaps = lang === "zh"
    ? ["AI 经验偏少,缺一个 Agent 案例", "设计领导经验需补充", "未量化最近一段经历的指标影响"]
    : ["Light on AI experience — missing an agent case", "Need more design leadership reps", "Last role impact not quantified"];

  const [savedAs, setSavedAs] = useStateM("");

  return (
    <div className="page-pad" data-screen-label="06 Match · Result">
      <div className="match-result-head">
        <button className="btn-link match-back" onClick={onBack}>← {t("match_back")}</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
            {role} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· {co}</span>
          </h1>
          <div style={{ color: "var(--ink-3)", fontSize: 14, marginTop: 4 }}>
            {score >= 85 ? t("match_quality_strong") : score >= 75 ? t("match_quality_good") : t("match_quality_partial")} ·
            {" "}{strengths.length} {lang === "zh" ? "项优势" : "strengths"} · {gaps.length} {lang === "zh" ? "处可补强" : "gaps"}
          </div>
        </div>
      </div>

      <div className="match-result-grid">
        <div className="panel">
          <div className="panel-title">{t("match_radar")}</div>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <_RadarChart dims={dims} values={yourValues} size={280} />
          </div>
          <div className="radar-legend">
            <div><span className="dot" style={{ background: "#5367F3" }}></span>{lang === "zh" ? "你" : "You"}</div>
            <div><span className="dot" style={{ background: "rgba(83,103,243,0.25)" }}></span>{lang === "zh" ? "岗位要求" : "Role bar"}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="match-score-card">
              <div className="match-ring">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(83,103,243,0.12)" strokeWidth="7" />
                  <circle cx="42" cy="42" r="36" fill="none" stroke="#5367F3" strokeWidth="7"
                          strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * (1 - score / 100)}
                          strokeLinecap="round" transform="rotate(-90 42 42)" />
                </svg>
                <div className="match-ring-num" style={{ width: 84, height: 84, fontSize: 24 }}>{score}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em" }}>
                  {t("match_score")}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
                  {lang === "zh" ? "在你的同岗位申请者中位列前 18%" : "Top 18% among similar candidates"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <input className="input" placeholder={t("match_save_as")} value={savedAs} onChange={(e) => setSavedAs(e.target.value)}
                     style={{ flex: 1, minWidth: 140 }} />
              <button className="btn btn-primary">{lang === "zh" ? "保存版本" : "Save"}</button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">{t("match_strengths")}</div>
            <ul className="match-list">
              {strengths.map((s, i) => <li key={i}><span className="match-list-icon good">✓</span><span>{s}</span></li>)}
            </ul>
          </div>
          <div className="panel">
            <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{t("match_gaps")}</span>
              <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={onJumpGrow}>
                {t("match_open_grow")} →
              </button>
            </div>
            <ul className="match-list">
              {gaps.map((s, i) => (
                <li key={i}>
                  <span className="match-list-icon gap">!</span>
                  <span style={{ flex: 1 }}>{s}</span>
                  <button className="btn-link" onClick={onJumpGrow}>{t("match_open_grow")}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Top-level wrapper */
const MatchScreen = ({ onJumpGrow }) => {
  const [view, setView] = useStateM("entry"); // entry | result
  const [jd, setJd] = useStateM("");
  const [resultCtx, setResultCtx] = useStateM(null);

  const goAnalyze = () => {
    setResultCtx({ score: 82 });
    setView("result");
  };
  const goHistory = (h) => {
    setResultCtx({ score: h.score, role: h.role, co: h.co });
    setView("result");
  };

  return view === "entry"
    ? <MatchEntry jd={jd} setJd={setJd} onAnalyze={goAnalyze} onPickHistory={goHistory} />
    : <MatchResult context={resultCtx || {}} onBack={() => setView("entry")} onJumpGrow={onJumpGrow} />;
};

window.MatchScreen = MatchScreen;
