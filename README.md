# CareerPal

CareerPal is split into two applications:

- `frontend/`: Next.js React SPA.
- `backend/`: FastAPI API.

## Backend

Run tests:

```bash
cd backend && pytest
```

Run locally:

```bash
cd backend && uvicorn app.main:app --reload
```

## Frontend

npm is the canonical package manager for this repo unless the project explicitly switches package managers later.

Run tests:

```bash
cd frontend && npm test -- --run
```

Run locally:

```bash
cd frontend && npm run dev
```

Build:

```bash
cd frontend && npm run build
```
