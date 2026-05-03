from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_health_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "careerpal-backend"}


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
