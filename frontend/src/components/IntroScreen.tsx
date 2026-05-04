interface IntroScreenProps {
  onGetStarted: () => void;
}

export function IntroScreen({ onGetStarted }: IntroScreenProps) {
  return (
    <main className="intro-shell">
      <section className="intro-panel" aria-labelledby="intro-title">
        <p className="eyebrow">CareerPal</p>
        <h1 id="intro-title">Build your career profile through conversation.</h1>
        <p className="intro-copy">
          Share what you have, then let CareerPal shape it into a focused profile workspace.
        </p>
        <button className="btn btn-accent btn-lg" type="button" onClick={onGetStarted}>
          Get started
        </button>
      </section>
      <aside className="companion-preview" aria-label="CareerPal companion preview">
        <div className="chat-bubble assistant">Tell me where you want to go next. I will help organize the proof.</div>
        <div className="chat-bubble user">I am aiming for backend SWE internships.</div>
      </aside>
    </main>
  );
}
