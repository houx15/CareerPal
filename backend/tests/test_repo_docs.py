from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_readme_documents_separate_app_commands():
    readme = (ROOT / "README.md").read_text()

    assert "cd backend && pytest" in readme
    assert "cd frontend && npm test -- --run" in readme
    assert "cd backend && uvicorn app.main:app --reload" in readme
    assert "cd frontend && npm run dev" in readme
    assert "cd frontend && npm run build" in readme


def test_agent_docs_and_gates_use_npm_frontend_commands():
    agent_guide = (ROOT / "AGENTS.md").read_text()
    tdd_config = (ROOT / ".opencode/tdd-guardian/config.json").read_text()

    assert "cd frontend && npm test -- --run" in agent_guide
    assert "cd frontend && npm run dev" in agent_guide
    assert "cd frontend && npm run build" in agent_guide
    assert "cd frontend && npm test -- --run" in tdd_config
    assert "pnpm" not in agent_guide
    assert "pnpm" not in tdd_config
