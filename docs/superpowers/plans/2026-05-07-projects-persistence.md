# Projects Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist profile projects end to end so the workspace Projects section can save, reload, edit, remove, and report completeness using the schema in `docs/SPEC.md`.

**Architecture:** Follow the already implemented education/experience pattern: backend stores profile-owned list items with `sort_order`, `PATCH /api/profile` replaces the whole project list, and `GET /api/profile` returns display-order items. The frontend keeps the design-bundle Projects drawer interaction from `docs/careerpal/project/workspace.jsx` while expanding the persisted data to the spec fields.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Next.js, React, Vitest, Testing Library, TypeScript.

---

## File Structure

Backend:
- Modify `backend/app/models/user.py`: add `Project` model and `Profile.project_items` relationship.
- Create `backend/alembic/versions/0005_project_items.py`: create/drop `projects` table.
- Modify `backend/app/schemas/profile.py`: add `ProjectItem`, `ProjectItemUpdate`; include `projects` in `ProfileResponse` and `ProfileUpdate`.
- Modify `backend/app/api/profile.py`: serialize, replace, and compute completeness for projects.
- Modify `backend/tests/test_profile.py`: add failing tests for project persistence, replacement/removal, optional defaults, validation, and completeness.

Frontend:
- Modify `frontend/src/lib/types.ts`: add `ProjectItem`; type `Profile.projects` and `ProfilePatch.projects`.
- Modify `frontend/src/fixtures/careerpalDemoData.ts`: type demo project items with spec-backed shape while preserving display compatibility.
- Modify `frontend/src/components/Workspace.tsx`: pass `projects` through the production adapter and save response.
- Modify `frontend/src/components/workspace/Workspace.tsx`: merge persisted/saved projects into `DemoProfile`.
- Modify `frontend/src/components/workspace/WorkspaceOverlays.tsx`: replace generic fallback for `projects` with a Projects drawer matching the design bundle and saving spec fields.
- Modify `frontend/src/components/StageApp.test.tsx`: prove persisted projects render after login/reload.
- Modify `frontend/src/components/Workspace.test.tsx` or `frontend/src/components/workspace/WorkspaceScreens.test.tsx`: prove editing projects calls `onPatchProfile({ projects: [...] })`.

---

## Data Contract

Backend and frontend project item:

```ts
interface ProjectItem {
  name: string;
  description: string;
  tech_stack: string[];
  achievements: string[];
  link?: string | null;
  comment?: string | null;
  completeness?: "sparse" | "partial" | "complete";
}
```

Frontend display compatibility:
- The profile card may continue reading `title`/`note` if already present in demo data.
- Persisted projects should be normalized into display rows where `name` is the title-equivalent and `description` is the note-equivalent.
- Do not add unrelated visual redesigns; keep the `edit-card`, `Field`, remove, add, cancel, save interaction already used by the design bundle.

Completeness rules for this slice:
- `empty`: no project rows.
- `complete`: at least one project has non-empty `name`, non-empty `description`, at least one non-empty `tech_stack` item, and at least one non-empty `achievement`.
- `partial`: at least one row exists but no row meets the complete rule.

---

## Task 1: Backend Project Persistence

**Files:**
- Modify: `backend/tests/test_profile.py`
- Modify: `backend/app/models/user.py`
- Create: `backend/alembic/versions/0005_project_items.py`
- Modify: `backend/app/schemas/profile.py`
- Modify: `backend/app/api/profile.py`

- [ ] **Step 1: Write failing backend tests**

Add these tests to `backend/tests/test_profile.py`:

```python
def test_profile_patch_replaces_projects_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "projects": [
                {
                    "name": "CareerPal",
                    "description": "Built a career companion workspace.",
                    "tech_stack": ["Next.js", "FastAPI"],
                    "achievements": ["Persisted profile project data end to end"],
                    "link": "https://example.com/careerpal",
                    "comment": "Strong full-stack project",
                },
                {
                    "name": "Campus Planner",
                    "description": "Created a student schedule planner.",
                    "tech_stack": ["React"],
                    "achievements": [],
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["projects"] == [
        {
            "name": "CareerPal",
            "description": "Built a career companion workspace.",
            "tech_stack": ["Next.js", "FastAPI"],
            "achievements": ["Persisted profile project data end to end"],
            "link": "https://example.com/careerpal",
            "comment": "Strong full-stack project",
        },
        {
            "name": "Campus Planner",
            "description": "Created a student schedule planner.",
            "tech_stack": ["React"],
            "achievements": [],
            "link": None,
            "comment": None,
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["projects"] == response.json()["projects"]


def test_profile_patch_replacing_projects_with_shorter_list_removes_old_items(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "projects": [
                {"name": "First", "description": "One", "tech_stack": ["React"], "achievements": []},
                {"name": "Second", "description": "Two", "tech_stack": ["FastAPI"], "achievements": []},
            ]
        },
    )

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "Second", "description": "Two", "tech_stack": ["FastAPI"], "achievements": []}]},
    )

    assert response.status_code == 200
    assert response.json()["projects"] == [
        {
            "name": "Second",
            "description": "Two",
            "tech_stack": ["FastAPI"],
            "achievements": [],
            "link": None,
            "comment": None,
        }
    ]


def test_profile_patch_defaults_optional_project_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "Campus Planner", "description": "Built scheduling views."}]},
    )

    assert response.status_code == 200
    assert response.json()["projects"] == [
        {
            "name": "Campus Planner",
            "description": "Built scheduling views.",
            "tech_stack": [],
            "achievements": [],
            "link": None,
            "comment": None,
        }
    ]


def test_profile_patch_rejects_overlong_project_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "P" * 256, "description": "Built scheduling views."}]},
    )

    assert response.status_code == 422


def test_completeness_reports_projects_complete_when_required_fields_exist(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "projects": [
                {
                    "name": "CareerPal",
                    "description": "Built profile persistence.",
                    "tech_stack": ["Next.js"],
                    "achievements": ["Saved projects across reloads"],
                }
            ]
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["projects"] == "complete"


def test_completeness_reports_projects_partial_when_items_are_incomplete(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "CareerPal", "description": "Built profile persistence."}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["projects"] == "partial"
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
cd backend && python3 -m pytest tests/test_profile.py -q
```

Expected: the new project tests fail because `projects` is not accepted by `ProfileUpdate` and backend completeness still hardcodes projects as `empty`.

- [ ] **Step 3: Add model and migration**

In `backend/app/models/user.py`, add `project_items` to `Profile`:

```python
    project_items: Mapped[list["Project"]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="Project.sort_order",
    )
```

Add this model after `Experience`:

```python
class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tech_stack: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    achievements: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)

    profile: Mapped[Profile] = relationship(back_populates="project_items")
```

Create `backend/alembic/versions/0005_project_items.py` with `down_revision = "0004_experience_items"` and a `projects` table containing the base project columns plus an index on `profile_id`. Create `backend/alembic/versions/0006_project_item_completeness.py` with `down_revision = "0005_project_items"` to add the `completeness` column using SQLite-compatible `op.add_column(... server_default="partial")`.

- [ ] **Step 4: Add schemas**

In `backend/app/schemas/profile.py`, add:

```python
class ProjectItem(BaseModel):
    name: str = Field(max_length=255)
    description: str = ""
    tech_stack: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    link: str | None = Field(default=None, max_length=500)
    comment: str | None = None
    completeness: Literal["sparse", "partial", "complete"] = "partial"


class ProjectItemUpdate(ProjectItem):
    model_config = ConfigDict(extra="forbid")
```

Then type:

```python
projects: list[ProjectItem] = Field(default_factory=list)
```

in `ProfileResponse`, and:

```python
projects: list[ProjectItemUpdate] | None = None
```

in `ProfileUpdate`.

- [ ] **Step 5: Wire API serialization, patching, and completeness**

In `backend/app/api/profile.py`:
- Import `Project` and `ProjectItem`.
- Add `projects=[ProjectItem(...)]` to `_profile_response()`.
- Pop `projects = updates.pop("projects", None)` in `update_profile()`.
- Replace `profile.project_items` when projects is not `None`, using `.get()` defaults for `description`, `tech_stack`, `achievements`, `link`, and `comment`.
- Compute project completeness using the rule in this plan and set `sections["projects"] = projects`.

- [ ] **Step 6: Run backend tests to verify GREEN**

Run:

```bash
cd backend && alembic upgrade head && python3 -m pytest tests/test_profile.py -q
```

Expected: profile tests pass.

---

## Task 2: Frontend Project Persistence

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/fixtures/careerpalDemoData.ts`
- Modify: `frontend/src/components/Workspace.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Modify: `frontend/src/components/StageApp.test.tsx`
- Modify: `frontend/src/components/Workspace.test.tsx` or `frontend/src/components/workspace/WorkspaceScreens.test.tsx`

- [ ] **Step 1: Write failing frontend tests**

Add a StageApp test that mocks login/profile responses where `projects` contains:

```ts
[
  {
    name: "CareerPal",
    description: "Built a design-faithful profile workspace.",
    tech_stack: ["Next.js", "FastAPI"],
    achievements: ["Persisted projects across reloads"],
    link: "https://example.com/careerpal",
    comment: "Full-stack project",
  },
]
```

Assert that after login the workspace renders `CareerPal` and `Built a design-faithful profile workspace.`.

Add a workspace/editor test that opens the Projects section, changes project fields, clicks save, and asserts `onPatchProfile` receives:

```ts
{
  projects: [
    {
      name: "CareerPal",
      description: "Built profile persistence.",
      tech_stack: ["Next.js", "FastAPI"],
      achievements: ["Saved project data"],
      link: "https://example.com/careerpal",
      comment: null,
    },
  ],
}
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
cd frontend && npm test -- --run StageApp.test.tsx Workspace
```

Expected: persisted project display fails because the adapter/prototype does not pass projects through, and the drawer test fails because projects still uses the generic fallback or prototype-only `title`/`note` shape.

- [ ] **Step 3: Type project data**

In `frontend/src/lib/types.ts`, add:

```ts
export interface ProjectItem extends Record<string, unknown> {
  name: string;
  description: string;
  tech_stack: string[];
  achievements: string[];
  link?: string | null;
  comment?: string | null;
}
```

Then set `Profile.projects: ProjectItem[]` and include `"projects"` in `ProfilePatch`.

- [ ] **Step 4: Pass projects through adapter and workspace merge**

In `frontend/src/components/Workspace.tsx`:
- Import `ProjectItem`.
- Type `WorkspaceProfile.projects` as `ProjectItem[]`.
- Pass `projects: profile.projects` into `PrototypeWorkspace`.
- Return `projects: saved.projects` from `onPatchProfile`.

In `frontend/src/components/workspace/Workspace.tsx`:
- Read `const projects = savedProfile.projects ?? persistedProfile?.projects`.
- When defined, set:

```ts
projects: {
  state: projects.length > 0 ? "complete" : "empty",
  items: projects,
}
```

Add the dependencies to the `useMemo` dependency list.

- [ ] **Step 5: Implement Projects drawer**

In `frontend/src/components/workspace/WorkspaceOverlays.tsx`:
- Import `ProjectItem`.
- Add project-specific edit UI for `section === "projects"` before the generic fallback.
- Fields: Project name, Link, Description, Tech stack, Achievements.
- Use newline-separated textareas for `tech_stack` and `achievements`, parsed through the existing `splitDraftLines()` helper.
- Add/remove functions mirroring education/experience.
- Save payload should include `projects: draft.projects.items.map(normalizeProjectItem)`.

Use:

```ts
function normalizeProjectItem(project: ProjectItem): ProjectItem {
  return {
    name: project.name.trim(),
    description: project.description.trim(),
    tech_stack: project.tech_stack.map((item) => item.trim()).filter(Boolean),
    achievements: project.achievements.map((item) => item.trim()).filter(Boolean),
    link: project.link?.trim() || null,
    comment: project.comment?.trim() || null,
  };
}
```

Do not change unrelated section UI.

- [ ] **Step 6: Run frontend tests to verify GREEN**

Run:

```bash
cd frontend && npm test -- --run StageApp.test.tsx Workspace
```

Expected: new project tests pass.

---

## Task 3: Slice Verification And E2E

**Files:**
- No production files unless verification finds a bug requiring a new failing test first.

- [ ] **Step 1: Run full backend verification**

```bash
cd backend && alembic upgrade head && python3 -m pytest
```

Expected: all backend tests pass.

- [ ] **Step 2: Run full frontend verification**

```bash
cd frontend && npm test -- --run
cd frontend && npx tsc --noEmit
cd frontend && npm run build
```

Expected: all frontend tests pass, TypeScript passes, production build passes.

- [ ] **Step 3: Run proxy API E2E if local servers are available**

If `http://127.0.0.1:3001` and `http://127.0.0.1:8000` are already serving, register/login a fresh test user through the frontend proxy, patch `projects`, fetch `/api/profile`, and fetch `/api/profile/completeness`.

Expected:
- `GET /api/profile` returns the saved project list.
- `GET /api/profile/completeness` returns `sections.projects === "complete"` for a complete project.

- [ ] **Step 4: Clean generated artifacts**

Run:

```bash
git status --short
```

Remove generated artifacts such as `frontend/tsconfig.tsbuildinfo` if created. Do not remove user-authored changes.

- [ ] **Step 5: Commit and push**

```bash
git add backend frontend docs/superpowers/plans/2026-05-07-careerpal-master-roadmap.md docs/superpowers/plans/2026-05-07-projects-persistence.md
git commit -m "feat: persist project profile items"
git push
```

Expected: commit and push succeed on `main`.
