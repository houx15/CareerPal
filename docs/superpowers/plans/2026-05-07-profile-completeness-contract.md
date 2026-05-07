# Profile Completeness Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/api/profile/completeness` the deterministic source of truth for profile section states and make the workspace UI consume it consistently.

**Architecture:** Backend owns canonical section-state rules through small helper functions in `backend/app/api/profile.py`. Frontend maps backend `sections` into the design-bundle profile cards while preserving `docs/careerpal/project/screens.jsx` card order and interactions. Fresh saved data may still recompute local state immediately after a PATCH so the UI is not stale before the next completeness fetch.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, Next.js, React, Vitest, Testing Library.

---

## Contract

Section states are `empty`, `partial`, or `complete`.

- `basics`: complete when `name`, `headline`, and `target_direction` are present; partial when any one is present; empty when all are missing.
- `contact`: complete when `phone`, `contact_email`, and `location` are present; partial when any one is present; empty when all are missing.
- `summary`: complete when `comment` has text; empty otherwise.
- `education`: complete when at least one item has `school`, `degree`, and `time`; partial when items exist but none are complete; empty when no items exist.
- `experience`: complete when at least one item has `company`, `role`, `time`, `description`, and at least one achievement; partial when items exist but none are complete; empty when no items exist.
- `projects`: complete when at least one item has `name`, `description`, at least one tech stack value, and at least one achievement; partial when items exist but none are complete; empty when no items exist.
- `skills`: complete when at least one item has `name`, `category`, and a valid proficiency; partial when items exist but none are complete; empty when no items exist.
- `certificates`: complete when at least one item has `name`, `issuer`, and `date`; partial when items exist but none are complete; empty when no items exist.
- `overall`: complete only when all dashboard card sections (`basics`, `summary`, `experience`, `skills`, `projects`, `education`, `certificates`) are complete; partial when any contract section is non-empty; empty when every section is empty.

`contact` is returned by the API but is not added as a separate dashboard card because `docs/careerpal` does not define one.

## Files

- Modify: `backend/tests/test_profile.py`
- Modify: `backend/app/api/profile.py`
- Modify: `frontend/src/components/Workspace.test.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `docs/superpowers/plans/2026-05-07-careerpal-master-roadmap.md`

## Task 1: Backend Completeness Helpers And Contract Tests

**Files:**
- Test: `backend/tests/test_profile.py`
- Modify: `backend/app/api/profile.py`

- [ ] **Step 1: Write failing backend tests**

Add tests proving:

```python
def test_completeness_reports_empty_profile_contract(client):
    headers = auth_headers(client)

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "overall": "empty",
        "sections": {
            "basics": "empty",
            "contact": "empty",
            "summary": "empty",
            "experience": "empty",
            "skills": "empty",
            "projects": "empty",
            "education": "empty",
            "certificates": "empty",
        },
    }
```

```python
def test_completeness_reports_sparse_profile_as_partial_contract(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "name": "Alex Chen",
            "phone": "+1 555 0100",
            "education": [{"school": "University of Washington", "degree": "", "time": ""}],
            "experience": [{"company": "Campus IT", "role": "", "time": "", "description": "", "achievements": []}],
            "projects": [{"name": "CareerPal"}],
            "skills": [{"name": "Python", "category": "", "proficiency": "advanced"}],
            "certificates": [{"name": "AWS CCP", "issuer": "", "date": "2025-04-15"}],
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["overall"] == "partial"
    assert response.json()["sections"] == {
        "basics": "partial",
        "contact": "partial",
        "summary": "empty",
        "experience": "partial",
        "skills": "partial",
        "projects": "partial",
        "education": "partial",
        "certificates": "partial",
    }
```

```python
def test_completeness_reports_complete_profile_contract(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "name": "Alex Chen",
            "headline": "Backend engineer",
            "target_direction": "Platform engineering",
            "phone": "+1 555 0100",
            "contact_email": "alex.contact@example.com",
            "location": "Seattle, WA",
            "comment": "I build reliable student tools.",
            "education": [{"school": "University of Washington", "degree": "B.S. CS", "time": "2023 - 2027"}],
            "experience": [
                {
                    "company": "Stripe",
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs.",
                    "achievements": ["Reduced manual review time by 30%"],
                }
            ],
            "projects": [
                {
                    "name": "CareerPal",
                    "description": "Built profile persistence.",
                    "tech_stack": ["Next.js"],
                    "achievements": ["Saved profile data"],
                }
            ],
            "skills": [{"name": "Python", "category": "Programming", "proficiency": "advanced"}],
            "certificates": [{"name": "AWS CCP", "issuer": "AWS", "date": "2025-04-15"}],
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["overall"] == "complete"
    assert set(response.json()["sections"].values()) == {"complete"}
```

- [ ] **Step 2: Run backend tests to verify RED**

Run:

```bash
cd backend && python3 -m pytest tests/test_profile.py -k "completeness_reports_empty_profile_contract or completeness_reports_sparse_profile_as_partial_contract or completeness_reports_complete_profile_contract" -q
```

Expected: FAIL because `contact` is missing and `overall` never becomes `complete`.

- [ ] **Step 3: Implement backend helpers**

In `backend/app/api/profile.py`, add:

```python
def _has_text(value: str | None) -> bool:
    return bool(value and value.strip())


def _fields_state(values: list[str | None]) -> str:
    present_count = sum(1 for value in values if _has_text(value))
    if present_count == len(values):
        return "complete"
    if present_count > 0:
        return "partial"
    return "empty"
```

Refactor `get_profile_completeness()` to build every contract state from helpers, include `contact`, and calculate `overall` from dashboard sections.

- [ ] **Step 4: Run backend tests to verify GREEN**

Run:

```bash
cd backend && python3 -m pytest tests/test_profile.py -q
```

Expected: PASS.

## Task 2: Frontend Backend-State Mapping

**Files:**
- Test: `frontend/src/components/Workspace.test.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`

- [ ] **Step 1: Write failing frontend tests**

Add tests proving backend completeness controls persisted section cards:

```tsx
it("uses backend completeness for persisted basics summary experience and education", () => {
  renderWorkspace({
    profile: {
      name: "Alex Chen",
      headline: "Backend engineer",
      target_direction: "Platform engineering",
      comment: "I build reliable student tools.",
      experience: [{ company: "Campus IT", role: "", time: "2024", description: "", achievements: [] }],
      education: [{ school: "University of Washington", degree: "", time: "" }],
    },
    completeness: {
      sections: {
        basics: "complete",
        summary: "complete",
        experience: "partial",
        education: "partial",
      },
    },
  });

  expect(within(screen.getByText("Basics").closest("article") as HTMLElement).getByText("Complete")).toBeInTheDocument();
  expect(within(screen.getByText("Summary").closest("article") as HTMLElement).getByText("Complete")).toBeInTheDocument();
  expect(within(screen.getByText("Experience").closest("article") as HTMLElement).getByText("Partial")).toBeInTheDocument();
  expect(within(screen.getByText("Education").closest("article") as HTMLElement).getByText("Partial")).toBeInTheDocument();
});
```

```tsx
it("keeps saved education and experience status current before completeness refetch", async () => {
  const user = userEvent.setup();
  const { onPatchProfile } = renderWorkspace({
    profile: { education: [], experience: [] },
    completeness: {
      sections: {
        education: "empty",
        experience: "empty",
      },
    },
  });
  onPatchProfile.mockResolvedValue({
    education: [{ school: "University of Washington", degree: "B.S. CS", time: "2023 - 2027" }],
  });

  await user.click(screen.getByRole("button", { name: /edit education/i }));
  await user.click(screen.getByRole("button", { name: /\+ add another/i }));
  await user.type(screen.getByLabelText("School"), "University of Washington");
  await user.type(screen.getByLabelText("Degree"), "B.S. CS");
  await user.type(screen.getByLabelText("Time period"), "2023 - 2027");
  await user.click(screen.getByRole("button", { name: /^save$/i }));

  expect(within((await screen.findByText("Education")).closest("article") as HTMLElement).getByText("Complete")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run frontend tests to verify RED**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx
```

Expected: FAIL because the frontend currently derives several persisted states locally or from sample data.

- [ ] **Step 3: Implement frontend mapping**

In `frontend/src/components/workspace/Workspace.tsx`:

- map `completeness.sections.summary` to `summarySec.state`.
- use backend `basics`, `summary`, `education`, and `experience` states when persisted data is present and that section has not just been saved.
- keep local recomputation for recently saved `education`, `experience`, `projects`, `skills`, and `certificates`.
- add `basicsSectionState`, `summarySectionState`, `educationSectionState`, and `experienceSectionState` helpers matching the backend contract.

- [ ] **Step 4: Run frontend tests to verify GREEN**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx
```

Expected: PASS.

## Task 3: Roadmap And Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-05-07-careerpal-master-roadmap.md`

- [ ] **Step 1: Update roadmap**

Change Slice 1.4 status/scope notes to indicate it is complete after implementation.

- [ ] **Step 2: Full verification**

Run:

```bash
cd backend && python3 -m pytest
cd frontend && npm test -- --run
cd frontend && npx tsc --noEmit
cd frontend && npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Review**

Request review against this plan and the diff. Fix Critical or Important findings with TDD.

