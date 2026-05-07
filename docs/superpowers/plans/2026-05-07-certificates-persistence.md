# Certificates Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist profile certificates end to end so saved certificates survive reloads, drive completeness, and can be edited from the design-faithful Profile workspace.

**Architecture:** Follow the established replace-list pattern used by education, experience, projects, and skills. Backend stores certificates as ordered child rows on `Profile`; frontend maps persisted/saved certificate arrays into the existing `DemoProfile` shape and adds a compact Certificates card/drawer using the same profile-card and edit-card design language from `docs/careerpal/project`.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Next.js, React, TypeScript, Vitest, Testing Library.

---

## Spec And Design Constraints

- `docs/SPEC.md` certificate fields: `id`, `profile_id`, `name`, `issuer`, `date`, `comment`.
- Public `/api/profile` shape should expose editable item fields only: `name`, `issuer`, `date`, `comment`.
- `PATCH /api/profile` should accept `certificates` and replace the full certificate list in display order.
- Completeness: `empty` when no certificate rows, `complete` when at least one certificate has non-empty `name`, `issuer`, and `date`, otherwise `partial`.
- `docs/careerpal/project` has no first-class certificate card today; extend the same card grid and drawer pattern rather than adding a new flow or marketing-style UI.
- No secrets or third-party services are required.

## File Structure

- Backend model/migration: `backend/app/models/user.py`, `backend/alembic/versions/0008_certificate_items.py`.
- Backend schema/API/tests: `backend/app/schemas/profile.py`, `backend/app/api/profile.py`, `backend/tests/test_profile.py`.
- Frontend types/data/wrappers: `frontend/src/lib/types.ts`, `frontend/src/fixtures/careerpalDemoData.ts`, `frontend/src/components/Workspace.tsx`, `frontend/src/components/workspace/Workspace.tsx`.
- Frontend UI/tests: `frontend/src/components/workspace/ProfileDashboard.tsx`, `frontend/src/components/workspace/WorkspaceOverlays.tsx`, `frontend/src/i18n/copy.ts`, `frontend/src/components/Workspace.test.tsx`, `frontend/src/components/StageApp.test.tsx`.

---

### Task 1: Backend Certificate Persistence

**Files:**
- Create: `backend/alembic/versions/0008_certificate_items.py`
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/schemas/profile.py`
- Modify: `backend/app/api/profile.py`
- Test: `backend/tests/test_profile.py`

- [x] **Step 1: Write failing backend tests**

Add tests for ordered replacement, empty-list deletion, overlong validation, and completeness:

```python
def test_profile_patch_replaces_certificates_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "certificates": [
                {
                    "name": "AWS Certified Cloud Practitioner",
                    "issuer": "Amazon Web Services",
                    "date": "2025-04-15",
                    "comment": "Cloud foundation",
                },
                {
                    "name": "Scrum Fundamentals",
                    "issuer": "ScrumStudy",
                    "date": "2024-10-01",
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["certificates"] == [
        {
            "name": "AWS Certified Cloud Practitioner",
            "issuer": "Amazon Web Services",
            "date": "2025-04-15",
            "comment": "Cloud foundation",
        },
        {
            "name": "Scrum Fundamentals",
            "issuer": "ScrumStudy",
            "date": "2024-10-01",
            "comment": None,
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["certificates"] == response.json()["certificates"]


def test_profile_patch_replaces_certificates_with_empty_list(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "AWS CCP", "issuer": "AWS", "date": "2025-04-15"}]},
    )

    response = client.patch("/api/profile", headers=headers, json={"certificates": []})

    assert response.status_code == 200
    assert response.json()["certificates"] == []
    assert client.get("/api/profile", headers=headers).json()["certificates"] == []


def test_profile_patch_rejects_overlong_certificate_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "C" * 256, "issuer": "AWS", "date": "2025-04-15"}]},
    )

    assert response.status_code == 422


def test_completeness_reports_certificates_complete_when_required_fields_exist(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "AWS CCP", "issuer": "AWS", "date": "2025-04-15"}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["certificates"] == "complete"


def test_completeness_reports_certificates_partial_when_items_are_incomplete(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "AWS CCP", "issuer": "", "date": "2025-04-15"}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["certificates"] == "partial"
```

- [x] **Step 2: Run tests to verify RED**

Run:

```bash
cd backend && python3 -m pytest tests/test_profile.py -k "certificate or completeness" -q
```

Expected: FAIL because `ProfileUpdate` forbids `certificates` and completeness lacks the `certificates` section.

- [x] **Step 3: Implement backend certificate persistence**

Add `Certificate` model/table migration, typed `CertificateItem` schemas, response mapping, PATCH replacement, and completeness calculation following the existing `Skill` pattern.

- [x] **Step 4: Run backend GREEN verification**

Run:

```bash
cd backend && python3 -m alembic upgrade head && python3 -m pytest tests/test_profile.py -q
```

Expected: all profile tests pass.

---

### Task 2: Frontend Certificate Workspace

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/fixtures/careerpalDemoData.ts`
- Modify: `frontend/src/components/Workspace.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `frontend/src/components/workspace/ProfileDashboard.tsx`
- Modify: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Modify: `frontend/src/i18n/copy.ts`
- Test: `frontend/src/components/Workspace.test.tsx`
- Test: `frontend/src/components/StageApp.test.tsx`

- [x] **Step 1: Write failing frontend tests**

Add tests for saved certificates, persisted card render, empty-name filtering, and login reload:

```tsx
it("saves edited certificates through the profile patch callback with spec fields", async () => {
  const user = userEvent.setup();
  const { onPatchProfile } = renderWorkspace({
    profile: {
      certificates: [{ name: "AWS CCP", issuer: "AWS", date: "2025-04-15", comment: null }],
    },
  });
  onPatchProfile.mockResolvedValue({
    certificates: [{ name: "Azure Fundamentals", issuer: "Microsoft", date: "2025-08-20", comment: "Cloud baseline" }],
  });

  await user.click(screen.getByRole("button", { name: /edit certificates/i }));
  await user.clear(screen.getByLabelText("Certificate name"));
  await user.type(screen.getByLabelText("Certificate name"), "Azure Fundamentals");
  await user.clear(screen.getByLabelText("Issuer"));
  await user.type(screen.getByLabelText("Issuer"), "Microsoft");
  await user.clear(screen.getByLabelText("Date"));
  await user.type(screen.getByLabelText("Date"), "2025-08-20");
  await user.type(screen.getByLabelText("Comment"), "  Cloud baseline  ");
  await user.click(screen.getByRole("button", { name: /^save$/i }));

  expect(onPatchProfile).toHaveBeenCalledWith({
    certificates: [{ name: "Azure Fundamentals", issuer: "Microsoft", date: "2025-08-20", comment: "Cloud baseline" }],
  });
  expect(await screen.findByText("Azure Fundamentals")).toBeInTheDocument();
});
```

- [x] **Step 2: Run tests to verify RED**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx src/components/StageApp.test.tsx
```

Expected: FAIL because the workspace does not expose `CertificateItem`, `Certificates` card, or drawer fields.

- [x] **Step 3: Implement frontend certificate UI and data wiring**

Add `CertificateItem` to profile types, include `certificates` in `ProfilePatch`, extend `DemoProfile`, add `sec_certificates` and improve chip copy, add `"certificates"` to `ProfileSectionId`, `SECTIONS`, workspace state, card rendering, drawer rendering, add/remove helpers, and normalization.

- [x] **Step 4: Run frontend GREEN verification**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx src/components/StageApp.test.tsx
```

Expected: updated focused tests pass.

---

### Task 3: Integration Review And Full Verification

**Files:**
- Review all changed files from Tasks 1 and 2.

- [x] **Step 1: Request code review**

Dispatch a reviewer to check spec compliance, TDD evidence, design fidelity, and regression risk.

- [x] **Step 2: Fix actionable review findings with tests first**

For each accepted finding, write or update a failing test before implementation, verify RED, implement the fix, then verify GREEN.

- [x] **Step 3: Run full verification**

Run:

```bash
cd backend && python3 -m alembic upgrade head && python3 -m pytest
cd frontend && npm test -- --run && npx tsc --noEmit && npm run build
```

Expected: backend tests, frontend tests, typecheck, and production build pass.

- [x] **Step 4: Proxy API E2E smoke**

With frontend/backend servers running, register or log in through the frontend API proxy, patch a certificate, read `/profile`, and read `/profile/completeness` to confirm the persisted certificate and `sections.certificates === "complete"`.

- [x] **Step 5: Commit**

Run:

```bash
git status --short
git add docs/superpowers/plans/2026-05-07-certificates-persistence.md backend frontend
git commit -m "feat: persist certificate profile items"
```
