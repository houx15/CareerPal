export function GrowScreen() {
  return (
    <div className="page-pad" data-screen-label="08 Grow">
      <div className="page-head">
        <h1>Grow your craft</h1>
        <p>Turn match gaps into a focused growth path.</p>
      </div>
      <div className="profile-grid">
        {["React evidence", "Interview stories", "Portfolio polish"].map((item) => (
          <article className="profile-card" key={item}>
            <div className="profile-card-title">{item}</div>
            <div className="profile-card-state partial">Next</div>
          </article>
        ))}
      </div>
    </div>
  );
}
