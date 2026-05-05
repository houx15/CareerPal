interface OnboardingScreenProps {
  isLoading: boolean;
  onShowWorkspace: () => void;
}

export function OnboardingScreen({ isLoading, onShowWorkspace }: OnboardingScreenProps) {
  return (
    <main className="app-shell" data-screen-label="04 Onboarding">
      <header className="app-bar">
        <div className="app-bar-left">
          <div className="app-bar-brand">CareerPal</div>
        </div>
        <div className="app-bar-right">
          <button className="btn btn-text" disabled={isLoading} type="button" onClick={onShowWorkspace}>
            I'll finish later
          </button>
        </div>
      </header>
      <section className="onb-stage" aria-busy={isLoading} aria-labelledby="onboarding-question">
        <aside className="onb-companion">
          <div className="know-card">
            <div className="know-overall">
              <div className="know-overall-row">
                <span className="know-overall-label">Overall</span>
                <span className="know-overall-pct">18%</span>
              </div>
              <div className="know-overall-bar">
                <div className="know-overall-fill" style={{ width: "18%" }} />
              </div>
            </div>
          </div>
        </aside>
        <div className="chat-col">
          <div className="chat-stream">
            <div className="msg-row">
              <div className="msg-bubble">
                <h1 id="onboarding-question" style={{ fontFamily: "var(--serif)", margin: 0 }}>
                  First, what brings you here today?
                </h1>
              </div>
            </div>
            <div className="option-row">
              {["I'm looking for a new job", "I want to grow in my current role", "I'm thinking about switching fields"].map((option) => (
                <button className="opt-pill" type="button" key={option}>
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="composer">
            <div className="composer-row">
              <textarea className="composer-input" placeholder="Just type your answer — or attach your resume" rows={1} />
              <button className="composer-send" type="button" disabled>
                ↑
              </button>
            </div>
          </div>
          {isLoading ? (
            <p className="loading-status" role="status">
              Loading workspace...
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
