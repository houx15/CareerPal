import { LangToggle } from "../../i18n/LangProvider";

export function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="page-pad" data-screen-label="10 Settings">
      <div className="page-head">
        <h1>Settings</h1>
        <p>Account preferences and workspace controls.</p>
      </div>
      <section className="panel">
        <div className="profile-card-title">Language</div>
        <div style={{ marginTop: 12 }}>
          <LangToggle />
        </div>
        <button className="btn btn-ghost" type="button" style={{ marginTop: 24 }} onClick={onLogout}>
          Log out
        </button>
      </section>
    </div>
  );
}
