from pathlib import Path


def test_readme_documents_separate_app_commands():
    readme = Path("../README.md").read_text()

    assert "cd backend && pytest" in readme
    assert "cd frontend && pnpm test --run" in readme
    assert "cd backend && uvicorn app.main:app --reload" in readme
    assert "cd frontend && pnpm dev" in readme
