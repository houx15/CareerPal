export function ActivityScreen() {
  return (
    <div className="page-pad" data-screen-label="09 Activity">
      <div className="page-head">
        <h1>Activity</h1>
        <p>Recent changes, job matches, and profile improvements.</p>
      </div>
      <div className="activity-list">
        {["Created living profile", "Matched Frontend Internship", "Updated skills evidence"].map((item) => (
          <article className="activity-item" key={item}>
            <div className="activity-dot" />
            <div>{item}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
