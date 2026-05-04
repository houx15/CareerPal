from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.core.config import get_settings


def test_health_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "careerpal-backend"}


def test_local_frontend_can_preflight_login(client):
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code in {200, 204}
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_initial_migration_exists():
    migration = Path("alembic/versions/0001_initial.py")

    assert migration.exists()
    assert "create_table('users'" in migration.read_text()
    assert "create_table('profiles'" in migration.read_text()
    assert "create_table('conversations'" in migration.read_text()


def test_initial_migration_creates_fresh_database(tmp_path):
    database = tmp_path / "careerpal.db"
    alembic_config = Config("alembic.ini")
    alembic_config.set_main_option("sqlalchemy.url", f"sqlite:///{database}")

    command.upgrade(alembic_config, "head")

    engine = create_engine(f"sqlite:///{database}")
    try:
        inspector = inspect(engine)

        assert set(inspector.get_table_names()) >= {"users", "profiles", "conversations"}
        assert "updated_at" in {column["name"] for column in inspector.get_columns("users")}
        assert "updated_at" in {column["name"] for column in inspector.get_columns("profiles")}
        assert {column["name"] for column in inspector.get_columns("conversations")} == {
            "id",
            "user_id",
            "context_type",
            "focus_node",
            "messages",
            "created_at",
            "updated_at",
        }
    finally:
        engine.dispose()


def test_initial_migration_defaults_to_configured_database_url(tmp_path, monkeypatch):
    database = tmp_path / "configured.db"
    default_database = Path("careerpal.db")
    monkeypatch.setenv("CAREERPAL_DATABASE_URL", f"sqlite:///{database}")
    get_settings.cache_clear()

    alembic_config = Config("alembic.ini")

    try:
        command.upgrade(alembic_config, "head")

        engine = create_engine(f"sqlite:///{database}")
        try:
            inspector = inspect(engine)

            assert set(inspector.get_table_names()) >= {"users", "profiles", "conversations"}
            assert not default_database.exists()
        finally:
            engine.dispose()
    finally:
        get_settings.cache_clear()
        default_database.unlink(missing_ok=True)
