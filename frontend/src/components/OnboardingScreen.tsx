interface OnboardingScreenProps {
  isLoading: boolean;
  onShowWorkspace: () => void;
}

export function OnboardingScreen({ isLoading, onShowWorkspace }: OnboardingScreenProps) {
  return (
    <main className="conversation-shell">
      <section className="chat-column" aria-busy={isLoading} aria-labelledby="resume-question">
        <div className="assistant-mark" aria-hidden="true" />
        <div className="chat-bubble assistant">
          <h1 id="resume-question">Do you have a resume you can share with me?</h1>
          <p>
            Resume upload and parsing are coming into this workspace in the next milestones. For now, you can continue
            into your profile space.
          </p>
        </div>
        <div className="action-row">
          <button className="btn btn-ghost" disabled={isLoading} type="button" onClick={onShowWorkspace}>
            I will add it later
          </button>
          <button className="btn btn-accent" disabled={isLoading} type="button" onClick={onShowWorkspace}>
            {isLoading ? "Loading workspace..." : "Show me my workspace"}
          </button>
        </div>
        {isLoading ? (
          <p className="loading-status" role="status">
            Loading workspace...
          </p>
        ) : null}
      </section>
    </main>
  );
}
