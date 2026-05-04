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

Run tests:

```bash
cd frontend && pnpm test --run
```

Run locally:

```bash
cd frontend && pnpm dev
```
