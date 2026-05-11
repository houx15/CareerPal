import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models import growth  # noqa: F401
from app.models import match  # noqa: F401
from app.models import page  # noqa: F401
from app.models import resume  # noqa: F401
from app.models import user  # noqa: F401


@pytest.fixture(autouse=True)
def deterministic_test_settings(monkeypatch):
    monkeypatch.setenv("CAREERPAL_LLM_PROVIDER", "fake")
    monkeypatch.setenv("CAREERPAL_LLM_MODEL_NAME", "careerpal-fake")
    monkeypatch.setenv("CAREERPAL_LLM_BASE_URL", "")
    monkeypatch.setenv("CAREERPAL_LLM_API_KEY", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(engine):
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(engine):
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
