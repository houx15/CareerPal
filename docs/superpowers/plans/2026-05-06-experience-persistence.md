# Experience Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist profile experience entries end-to-end so the Profile Experience card and edit drawer follow `docs/careerpal` while storing real backend data.

**Architecture:** Follow the existing education persistence pattern. Backend `PATCH /api/profile` replaces the ordered experience list, `GET /api/profile` returns it, and `/api/profile/completeness` reports `empty`, `partial`, or `complete`. Frontend maps persisted API experience rows into the existing prototype profile card and drawer without changing the polished visual design.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pytest, Next.js React, TypeScript, Vitest, Testing Library.

---

## File Structure

- Modify `backend/app/models/user.py`: add `Experience` model and `Profile.experience_items` relationship.
- Modify `backend/app/schemas/profile.py`: add typed `ExperienceItem`, include `experience` in `ProfileUpdate`.
- Modify `backend/app/api/profile.py`: serialize, replace, and compute completeness for experience rows.
- Create `backend/alembic/versions/0004_experience_items.py`: create `experiences` table.
- Modify `backend/tests/test_profile.py`: add RED tests for replacement, deletion, validation, and completeness.
- Modify `frontend/src/lib/types.ts`: add typed `ExperienceItem` and include it in `ProfilePatch`.
- Modify `frontend/src/fixtures/careerpalDemoData.ts`: align demo experience item fields with persisted API fields.
- Modify `frontend/src/components/workspace/Workspace.tsx`: merge persisted experience into the demo profile.
- Modify `frontend/src/components/workspace/ProfileDashboard.tsx`: render typed experience rows from persisted/demo data.
- Modify `frontend/src/components/workspace/WorkspaceOverlays.tsx`: add Experience drawer fields, add/remove behavior, and save payload.
- Modify `frontend/src/components/Workspace.test.tsx`: add RED tests for editing, adding, removing persisted experience rows.

---

## Task 1: Backend Experience Persistence

**Files:**
- Modify: `backend/tests/test_profile.py`
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/schemas/profile.py`
- Modify: `backend/app/api/profile.py`
- Create: `backend/alembic/versions/0004_experience_items.py`

- [ ] **Step 1: Write failing backend tests**

Add tests to `backend/tests/test_profile.py`:

```python
def test_profile_patch_replaces_experience_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {
                    "company": "Stripe",
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs for payment reporting.",
                    "achievements": ["Reduced manual review time by 30%"],
                    "comment": "Strong backend systems example",
                },
                {
                    "company": "Campus IT",
                    "role": "Student Developer",
                    "time": "2024 - 2025",
                    "description": "Maintained internal ticketing integrations.",
                    "achievements": [],
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["experience"] == [
        {
            "company": "Stripe",
            "role": "Backend Engineering Intern",
            "time": "Summer 2025",
            "description": "Built reconciliation jobs for payment reporting.",
            "achievements": ["Reduced manual review time by 30%"],
            "comment": "Strong backend systems example",
        },
        {
            "company": "Campus IT",
            "role": "Student Developer",
            "time": "2024 - 2025",
            "description": "Maintained internal ticketing integrations.",
            "achievements": [],
            "comment": None,
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["experience"] == response.json()["experience"]
```

Also add:

```python
def test_profile_patch_replacing_experience_with_shorter_list_removes_old_items(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {"company": "First Co", "role": "Intern", "time": "2024", "description": "One", "achievements": []},
                {"company": "Second Co", "role": "Developer", "time": "2025", "description": "Two", "achievements": []},
            ]
        },
    )

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"experience": [{"company": "Second Co", "role": "Developer", "time": "2025", "description": "Two", "achievements": []}]},
    )

    assert response.status_code == 200
    assert response.json()["experience"] == [
        {"company": "Second Co", "role": "Developer", "time": "2025", "description": "Two", "achievements": [], "comment": None}
    ]
```

Also add:

```python
def test_profile_patch_rejects_overlong_experience_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {
                    "company": "C" * 256,
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs.",
                    "achievements": [],
                }
            ]
        },
    )

    assert response.status_code == 422
```

And add completeness coverage:

```python
def test_completeness_reports_experience_complete_when_required_fields_exist(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {
                    "company": "Stripe",
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs.",
                    "achievements": ["Reduced manual review time by 30%"],
                }
            ]
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["experience"] == "complete"
    assert response.json()["overall"] == "partial"
```

```python
def test_completeness_reports_experience_partial_when_items_are_incomplete(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"experience": [{"company": "Campus IT", "role": "", "time": "2024", "description": "", "achievements": []}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["experience"] == "partial"
```

- [ ] **Step 2: Verify RED**

Run:

```bash
cd backend && pytest tests/test_profile.py -q
```

Expected: the new experience tests fail because `experience` is not accepted or persisted yet.

- [ ] **Step 3: Add model and migration**

In `backend/app/models/user.py`, add `Experience` with `company`, `role`, `time`, `description`, JSON `achievements`, nullable `comment`, and `sort_order`. Add `Profile.experience_items` with `cascade="all, delete-orphan"` and `order_by="Experience.sort_order"`.

Create `backend/alembic/versions/0004_experience_items.py` with revision `0004_experience_items`, down revision `0003_education_items`, table `experiences`, and an index on `profile_id`.

- [ ] **Step 4: Add schemas and API behavior**

In `backend/app/schemas/profile.py`, add:

```python
class ExperienceItem(BaseModel):
    company: str = Field(max_length=255)
    role: str = Field(max_length=255)
    time: str = Field(max_length=120)
    description: str = ""
    achievements: list[str] = Field(default_factory=list)
    comment: str | None = None


class ExperienceItemUpdate(ExperienceItem):
    model_config = ConfigDict(extra="forbid")
```

Return `experience: list[ExperienceItem]` from `ProfileResponse`, accept `experience: list[ExperienceItemUpdate] | None` in `ProfileUpdate`, serialize sorted rows in `_profile_response`, replace `profile.experience_items` in `update_profile`, and compute experience completeness as:

- `empty`: no experience rows
- `complete`: any row has non-empty `company`, `role`, `time`, `description`, and at least one achievement
- `partial`: otherwise has at least one row

- [ ] **Step 5: Verify GREEN**

Run:

```bash
cd backend && pytest tests/test_profile.py -q
```

Expected: profile tests pass.

---

## Task 2: Frontend Experience Drawer And Card Persistence

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/fixtures/careerpalDemoData.ts`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `frontend/src/components/workspace/ProfileDashboard.tsx`
- Modify: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Modify: `frontend/src/components/Workspace.test.tsx`

- [ ] **Step 1: Write failing frontend tests**

Add tests to `frontend/src/components/Workspace.test.tsx`:

```tsx
it("saves edited experience through the profile patch callback and updates the card", async () => {
  const user = userEvent.setup();
  const { onPatchProfile } = renderWorkspace();
  onPatchProfile.mockResolvedValue({
    experience: [
      {
        company: "Stripe",
        role: "Backend Engineering Intern",
        time: "Summer 2025",
        description: "Built reconciliation jobs for payment reporting.",
        achievements: ["Reduced manual review time by 30%"],
      },
    ],
  });

  await user.click(screen.getAllByRole("button", { name: /edit/i })[2]);
  await user.clear(screen.getByLabelText("Company"));
  await user.type(screen.getByLabelText("Company"), "Stripe");
  await user.clear(screen.getByLabelText("Role"));
  await user.type(screen.getByLabelText("Role"), "Backend Engineering Intern");
  await user.clear(screen.getByLabelText("Time period"));
  await user.type(screen.getByLabelText("Time period"), "Summer 2025");
  await user.clear(screen.getByLabelText("Description"));
  await user.type(screen.getByLabelText("Description"), "Built reconciliation jobs for payment reporting.");
  await user.clear(screen.getByLabelText("Achievements"));
  await user.type(screen.getByLabelText("Achievements"), "Reduced manual review time by 30%");
  await user.click(screen.getByRole("button", { name: /^save$/i }));

  expect(onPatchProfile).toHaveBeenCalledWith({
    experience: [
      {
        company: "Stripe",
        role: "Backend Engineering Intern",
        time: "Summer 2025",
        description: "Built reconciliation jobs for payment reporting.",
        achievements: ["Reduced manual review time by 30%"],
      },
    ],
  });
  expect(await screen.findByText("Backend Engineering Intern · Stripe")).toBeInTheDocument();
  expect(screen.getByText("Summer 2025")).toBeInTheDocument();
  expect(screen.getByText("Built reconciliation jobs for payment reporting.")).toBeInTheDocument();
});
```

Also add:

```tsx
it("saves added experience rows in order", async () => {
  const user = userEvent.setup();
  const { onPatchProfile } = renderWorkspace();
  onPatchProfile.mockResolvedValue({
    experience: [
      { company: "Linear", role: "Lead Designer", time: "2023 - present", description: "Shipped issue triage v2.", achievements: [] },
      { company: "Stripe", role: "Backend Intern", time: "Summer 2025", description: "Built reporting jobs.", achievements: ["Cut review time 30%"] },
    ],
  });

  await user.click(screen.getAllByRole("button", { name: /edit/i })[2]);
  await user.click(screen.getByRole("button", { name: /\+ add another/i }));
  const companies = screen.getAllByLabelText("Company");
  const roles = screen.getAllByLabelText("Role");
  const periods = screen.getAllByLabelText("Time period");
  const descriptions = screen.getAllByLabelText("Description");
  const achievements = screen.getAllByLabelText("Achievements");
  await user.type(companies[1], "Stripe");
  await user.type(roles[1], "Backend Intern");
  await user.type(periods[1], "Summer 2025");
  await user.type(descriptions[1], "Built reporting jobs.");
  await user.type(achievements[1], "Cut review time 30%");
  await user.click(screen.getByRole("button", { name: /^save$/i }));

  expect(onPatchProfile).toHaveBeenCalledWith({
    experience: [
      { company: "Linear", role: "Lead Designer", time: "2023 - present", description: "Shipped issue triage v2.", achievements: [] },
      { company: "Stripe", role: "Backend Intern", time: "Summer 2025", description: "Built reporting jobs.", achievements: ["Cut review time 30%"] },
    ],
  });
});
```

Also add:

```tsx
it("removes experience rows before saving", async () => {
  const user = userEvent.setup();
  const { onPatchProfile } = renderWorkspace();
  onPatchProfile.mockResolvedValue({ experience: [] });

  await user.click(screen.getAllByRole("button", { name: /edit/i })[2]);
  await user.click(screen.getByRole("button", { name: /remove experience 1/i }));
  await user.click(screen.getByRole("button", { name: /^save$/i }));

  expect(onPatchProfile).toHaveBeenCalledWith({ experience: [] });
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx
```

Expected: new experience tests fail because the drawer still uses the fallback basics fields and returns `{}`.

- [ ] **Step 3: Add types and mapping**

Add `ExperienceItem` to `frontend/src/lib/types.ts` with fields `company`, `role`, `time`, `description`, `achievements`, optional `comment`. Use `experience: ExperienceItem[]` in `Profile`, and include `"experience"` in `ProfilePatch`.

Update `DemoProfile.experience.items` in `frontend/src/fixtures/careerpalDemoData.ts` to the same field names.

In `frontend/src/components/workspace/Workspace.tsx`, merge persisted/saved `experience` the same way `education` is merged and set state to `complete` when the list is non-empty.

- [ ] **Step 4: Add drawer controls and save payload**

In `frontend/src/components/workspace/WorkspaceOverlays.tsx`, add an Experience branch before the fallback section. Render one `fieldset.edit-card` per row with:

- `Company`
- `Role`
- `Time period`
- multiline `Description`
- multiline `Achievements`, shown as newline-separated text and saved as an array of non-empty trimmed lines
- `Remove` button with `aria-label={`Remove experience ${index + 1}`}`
- `+ Add another`

Update `profilePatchForSection()` so `experience` returns `{ experience: profile.experience.items }`.

- [ ] **Step 5: Update profile card rendering**

In `frontend/src/components/workspace/ProfileDashboard.tsx`, render `item.role`, `item.company`, `item.time`, and `item.description` for the experience card. Preserve the existing card layout and visual classes from the design.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx
```

Expected: workspace tests pass.

---

## Task 3: Integration Verification

**Files:**
- No production files should change unless verification reveals a bug.

- [ ] **Step 1: Apply database migration locally**

Run:

```bash
cd backend && alembic upgrade head
```

Expected: migration reaches `0004_experience_items`.

- [ ] **Step 2: Run full backend suite**

Run:

```bash
cd backend && pytest
```

Expected: all backend tests pass.

- [ ] **Step 3: Run full frontend suite and static checks**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npx tsc --noEmit
cd frontend && npm run build
```

Expected: all frontend tests, TypeScript, and production build pass.

- [ ] **Step 4: API-level E2E through frontend proxy**

With backend on `8000` and frontend on `3001`, register a fresh account, `PATCH /api/profile` through `http://127.0.0.1:3001/api/profile` with one experience entry, then verify `GET /api/profile` returns the same entry and `/api/profile/completeness` reports `experience: "complete"`.

- [ ] **Step 5: Commit**

Run:

```bash
git status --short
git add backend frontend docs/superpowers/plans/2026-05-06-experience-persistence.md
git commit -m "feat: persist experience profile items"
```

