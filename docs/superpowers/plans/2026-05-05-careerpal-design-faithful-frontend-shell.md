# CareerPal Design-Faithful Frontend Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the walking-skeleton frontend with a production Next.js shell that follows `docs/careerpal/project` for user flow, visual system, and core interactions.

**Architecture:** Port the prototype into focused React modules instead of patching the current simplified components. Keep backend integration centralized in `StageApp`, use existing auth/profile APIs, and use centralized demo fixtures for prototype-only workspace data until real backend entities exist.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Testing Library, same-origin API proxy.

---

## File Structure

Create frontend files:

- `frontend/src/i18n/copy.ts`: typed EN/ZH copy adapted from `docs/careerpal/project/i18n.jsx`.
- `frontend/src/i18n/LangProvider.tsx`: language context, `useLang`, and language toggle.
- `frontend/src/components/Slime.tsx`: production React version of the prototype companion SVG.
- `frontend/src/fixtures/careerpalDemoData.ts`: sample profile, match, grow, and activity data adapted from `data.jsx`.
- `frontend/src/components/IntroPage.tsx`: design-faithful intro page.
- `frontend/src/components/Onboarding.tsx`: onboarding chat and knowledge panel.
- `frontend/src/components/workspace/ProfileDashboard.tsx`: profile dashboard cards.
- `frontend/src/components/workspace/ResumeScreen.tsx`: living resume shell and versions.
- `frontend/src/components/workspace/MatchScreen.tsx`: JD entry and deterministic result screen.
- `frontend/src/components/workspace/GrowScreen.tsx`: growth path screen.
- `frontend/src/components/workspace/ActivityScreen.tsx`: activity timeline.
- `frontend/src/components/workspace/SettingsScreen.tsx`: settings screen.
- `frontend/src/components/workspace/WorkspaceOverlays.tsx`: improve overlay, edit drawer, user menu.
- `frontend/src/components/workspace/Workspace.tsx`: top nav shell and screen routing.

Modify frontend files:

- `frontend/src/app/globals.css`: replace simplified styling with production port of `styles.css`, adjusted for Next root elements.
- `frontend/src/app/layout.tsx`: load Fraunces and Inter fonts through Next font support or equivalent `<link>` metadata.
- `frontend/src/app/page.tsx`: keep rendering `StageApp`.
- `frontend/src/components/AuthScreens.tsx`: replace simplified auth/name screens with design-faithful login, signup, and name screens.
- `frontend/src/components/StageApp.tsx`: keep backend API integration but adopt prototype stage flow and data adapter.
- `frontend/src/components/StageApp.test.tsx`: update flow tests to match the prototype.
- `frontend/src/components/Workspace.test.tsx`: update workspace interaction tests.

---

## Task 1: Language, Slime, And Demo Data Foundations

**Files:**
- Create: `frontend/src/i18n/copy.ts`
- Create: `frontend/src/i18n/LangProvider.tsx`
- Create: `frontend/src/components/Slime.tsx`
- Create: `frontend/src/fixtures/careerpalDemoData.ts`
- Test: `frontend/src/i18n/LangProvider.test.tsx`
- Test: `frontend/src/components/Slime.test.tsx`

- [ ] **Step 1: Write failing language provider tests**

Create `frontend/src/i18n/LangProvider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LangProvider, LangToggle, useLang } from "./LangProvider";

function CopyProbe() {
  const { t, lang } = useLang();
  return (
    <div>
      <p data-testid="lang">{lang}</p>
      <p>{t("brand")}</p>
      <p>{t("intro_eyebrow")}</p>
    </div>
  );
}

describe("LangProvider", () => {
  it("defaults to English copy and can switch to Chinese", async () => {
    render(
      <LangProvider>
        <CopyProbe />
        <LangToggle compact />
      </LangProvider>,
    );

    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByText("AI career companion")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "中文" }));

    expect(screen.getByTestId("lang")).toHaveTextContent("zh");
    expect(screen.getByText("AI 职业伙伴")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the language test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/i18n/LangProvider.test.tsx
```

Expected: FAIL because `LangProvider` does not exist.

- [ ] **Step 3: Write failing Slime tests**

Create `frontend/src/components/Slime.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slime } from "./Slime";

describe("Slime", () => {
  it("renders the listening companion SVG with the requested size", () => {
    render(<Slime size={72} state="listening" />);

    const svg = screen.getByRole("img", { name: /careerpal companion listening/i });
    expect(svg).toHaveAttribute("width", "72");
    expect(svg).toHaveAttribute("height", "72");
    expect(svg.querySelector("animateTransform")).not.toBeNull();
  });

  it("renders a thinking state with thinking animation marks", () => {
    render(<Slime size={40} state="thinking" />);

    expect(screen.getByRole("img", { name: /careerpal companion thinking/i })).toBeInTheDocument();
    expect(document.querySelectorAll("animate").length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 4: Run the Slime test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/components/Slime.test.tsx
```

Expected: FAIL because `Slime` does not exist.

- [ ] **Step 5: Implement language provider, copy, Slime, and demo fixtures**

Implement these modules:

- `copy.ts` exports `type Lang = "en" | "zh"`, a `copy` object, and a `CopyKey` type.
- `LangProvider.tsx` exports `LangProvider`, `useLang`, and `LangToggle`.
- `Slime.tsx` ports the prototype SVG states with `role="img"` and state-specific `aria-label`.
- `careerpalDemoData.ts` exports sample profile objects shaped for the workspace screens.

The copy module must include at least all keys used in tests and the initial screens:

```ts
export type Lang = "en" | "zh";

export const copy = {
  en: {
    brand: "CareerPal",
    intro_eyebrow: "AI career companion",
    get_started: "Get started",
    sign_in: "Sign in",
  },
  zh: {
    brand: "CareerPal",
    intro_eyebrow: "AI 职业伙伴",
    get_started: "开始使用",
    sign_in: "登录",
  },
} as const;
```

Expand the object as later tasks require more keys; keep all lookup keys typed through `CopyKey`.

- [ ] **Step 6: Run foundation tests to verify they pass**

Run:

```bash
cd frontend && npm test -- --run src/i18n/LangProvider.test.tsx src/components/Slime.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/i18n frontend/src/components/Slime.tsx frontend/src/components/Slime.test.tsx frontend/src/fixtures
git commit -m "feat: add design system foundations"
```

---

## Task 2: Port Global Visual System

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`
- Test: `frontend/src/app/globals.test.ts`

- [ ] **Step 1: Write a failing CSS contract test**

Create `frontend/src/app/globals.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("CareerPal global CSS", () => {
  it("defines the prototype visual tokens and core shell classes", () => {
    expect(css).toContain("--accent: #5367F3");
    expect(css).toContain("--serif:");
    expect(css).toContain(".intro-hero");
    expect(css).toContain(".center-stage");
    expect(css).toContain(".app-shell");
    expect(css).toContain(".composer-row");
    expect(css).toContain(".profile-card");
    expect(css).toContain(".overlay-card");
  });

  it("keeps the app root full height with internal screen scrolling", () => {
    expect(css).toMatch(/html,\s*body/);
    expect(css).toContain("height: 100%");
    expect(css).toContain("overflow: hidden");
  });
});
```

- [ ] **Step 2: Run the CSS contract test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/app/globals.test.ts
```

Expected: FAIL until the prototype visual system is ported.

- [ ] **Step 3: Port CSS and font loading**

Replace `frontend/src/app/globals.css` with a production-safe port of `docs/careerpal/project/styles.css`.

Adjustments:

- Keep selectors and tokens from the prototype.
- Include `html, body, #__next` compatibility through `html, body { height: 100%; }`.
- Keep app screens scrollable inside `.intro`, `.page-pad`, `.chat-stream`, and drawer bodies.
- Avoid CSS that depends on the prototype `#root` id only.

Modify `frontend/src/app/layout.tsx` to load the prototype fonts. A valid implementation can use `next/font/google`:

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CareerPal",
  description: "AI career companion",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Run the CSS contract test to verify it passes**

Run:

```bash
cd frontend && npm test -- --run src/app/globals.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/layout.tsx frontend/src/app/globals.test.ts
git commit -m "style: port CareerPal prototype visual system"
```

---

## Task 3: Intro And Auth Flow

**Files:**
- Create: `frontend/src/components/IntroPage.tsx`
- Modify: `frontend/src/components/AuthScreens.tsx`
- Modify: `frontend/src/components/StageApp.tsx`
- Test: `frontend/src/components/StageApp.test.tsx`

- [ ] **Step 1: Replace StageApp flow tests with prototype flow expectations**

Update `frontend/src/components/StageApp.test.tsx` so the signup test uses the prototype labels:

```tsx
it("preserves prototype signup -> name -> onboarding -> workspace flow", async () => {
  const api = apiMock();
  render(<StageApp api={api} />);

  await userEvent.click(screen.getByRole("button", { name: /start free|get started/i }));
  await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
  await userEvent.click(screen.getByRole("button", { name: /send code/i }));
  await userEvent.type(screen.getByLabelText(/verification code/i), "123456");
  await userEvent.click(screen.getByRole("button", { name: /^next/i }));

  await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
  await userEvent.type(screen.getByLabelText(/password ✓/i), "secret123");
  await userEvent.click(screen.getByRole("button", { name: /^next/i }));

  await userEvent.type(screen.getByLabelText(/phone number/i), "+1 555 123 4567");
  await userEvent.click(screen.getByRole("button", { name: /send code/i }));
  await userEvent.type(screen.getByLabelText(/verification code/i), "654321");
  await userEvent.click(screen.getByRole("button", { name: /verify/i }));
  await userEvent.click(await screen.findByRole("button", { name: /continue/i }));

  expect(await screen.findByText(/what should i call you/i)).toBeInTheDocument();
  await userEvent.type(screen.getByPlaceholderText(/your name/i), "Alex Chen");
  await userEvent.click(screen.getByRole("button", { name: /nice to meet you/i }));

  expect(await screen.findByText(/what brings you here today/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /see my profile|i'll finish later/i }));

  await waitFor(() => expect(api.register).toHaveBeenCalledWith({
    email: "alex@example.com",
    username: "alex",
    password: "secret123",
  }));
  expect(await screen.findByText(/profile completion/i)).toBeInTheDocument();
});
```

Also update the login test to enter through `Sign in` from the intro page and expect the workspace after `Log in`.

- [ ] **Step 2: Run StageApp tests to verify they fail**

Run:

```bash
cd frontend && npm test -- --run src/components/StageApp.test.tsx
```

Expected: FAIL because the production components do not yet match the prototype labels and steps.

- [ ] **Step 3: Implement IntroPage and prototype auth screens**

Port these prototype components into production TypeScript:

- `IntroPage` from `intro.jsx`.
- `LoginScreen`, `SignUpScreen`, and `NameIntro` from `auth.jsx`.

Implementation requirements:

- `IntroPage` uses `Slime`, `useLang`, `LangToggle`, and demo profile data.
- `SignUpScreen` simulates email and phone code sending in local state.
- `SignUpScreen` calls `onComplete({ email, password, isNew: true })` after final completion.
- `StageApp` derives `username` from the email prefix for now because the prototype signup does not ask for username.
- Login still calls `api.login({ email, password })`.
- Existing users still go directly to workspace.

- [ ] **Step 4: Run StageApp tests to verify they pass**

Run:

```bash
cd frontend && npm test -- --run src/components/StageApp.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/IntroPage.tsx frontend/src/components/AuthScreens.tsx frontend/src/components/StageApp.tsx frontend/src/components/StageApp.test.tsx
git commit -m "feat: port prototype intro and auth flow"
```

---

## Task 4: Onboarding Chat And Knowledge Panel

**Files:**
- Create: `frontend/src/components/Onboarding.tsx`
- Modify: `frontend/src/components/StageApp.tsx`
- Test: `frontend/src/components/Onboarding.test.tsx`
- Test: `frontend/src/components/StageApp.test.tsx`

- [ ] **Step 1: Write failing onboarding tests**

Create `frontend/src/components/Onboarding.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import { Onboarding } from "./Onboarding";

function renderOnboarding(onDone = vi.fn()) {
  render(
    <LangProvider>
      <Onboarding user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com" }} onDone={onDone} />
    </LangProvider>,
  );
  return onDone;
}

describe("Onboarding", () => {
  it("shows the prototype prompt, options, and knowledge panel", async () => {
    renderOnboarding();

    expect(await screen.findByText(/what brings you here today/i)).toBeInTheDocument();
    expect(screen.getByText(/overall/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i'm looking for a new job/i })).toBeInTheDocument();
  });

  it("adds a user answer, shows thinking state, and can finish into profile", async () => {
    const onDone = renderOnboarding();

    await userEvent.click(await screen.findByRole("button", { name: /i'm looking for a new job/i }));
    expect(screen.getByText(/i'm looking for a new job/i)).toBeInTheDocument();
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();

    expect(await screen.findByText(/tell me about your most recent job/i)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/attach your resume/i), "Product intern at Acme");
    await userEvent.click(screen.getByRole("button", { name: "↑" }));

    const cta = await screen.findByRole("button", { name: /see my profile/i });
    await userEvent.click(cta);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Run onboarding tests to verify they fail**

Run:

```bash
cd frontend && npm test -- --run src/components/Onboarding.test.tsx
```

Expected: FAIL because `Onboarding` does not exist in the new module.

- [ ] **Step 3: Implement Onboarding and KnowledgePanel**

Port the onboarding section from `auth.jsx`.

Implementation requirements:

- Use deterministic message timing from the prototype.
- Keep option pills, composer, attach button, skip button, and knowledge panel.
- File input should store the selected filename and display the attach pill.
- `onDone` is called from skip and final CTA.
- Use accessible button labels for icon-only buttons: attach button has `aria-label`, send button has `aria-label="Send message"` while keeping visible arrow.

- [ ] **Step 4: Run onboarding and StageApp tests to verify they pass**

Run:

```bash
cd frontend && npm test -- --run src/components/Onboarding.test.tsx src/components/StageApp.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Onboarding.tsx frontend/src/components/Onboarding.test.tsx frontend/src/components/StageApp.tsx frontend/src/components/StageApp.test.tsx
git commit -m "feat: port prototype onboarding chat"
```

---

## Task 5: Workspace Shell, Profile, And Overlays

**Files:**
- Create: `frontend/src/components/workspace/ProfileDashboard.tsx`
- Create: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Create: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `frontend/src/components/Workspace.tsx` or replace it with a re-export
- Test: `frontend/src/components/Workspace.test.tsx`

- [ ] **Step 1: Replace workspace tests with prototype shell interactions**

Update `frontend/src/components/Workspace.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import { Workspace } from "./workspace/Workspace";

function renderWorkspace() {
  render(
    <LangProvider>
      <Workspace user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }} onLogout={vi.fn()} />
    </LangProvider>,
  );
}

describe("Workspace", () => {
  it("renders prototype top nav and profile dashboard by default", () => {
    renderWorkspace();

    expect(screen.getByText("CareerPal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /profile/i })).toHaveClass("active");
    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
  });

  it("opens edit drawer from a profile card and can switch to chat improvement", async () => {
    renderWorkspace();

    await userEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    expect(screen.getByText(/edit/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /talk to pal/i }));
    expect(screen.getByText(/polish your profile with Pal/i)).toBeInTheDocument();
  });

  it("opens improve overlay from profile dashboard", async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /improve via chat/i }));

    expect(screen.getByText(/which part should we work on/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /skills/i }));
    expect(screen.getByText(/let's polish your skills/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run workspace tests to verify they fail**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx
```

Expected: FAIL because the current workspace does not match the prototype.

- [ ] **Step 3: Implement workspace shell, profile dashboard, overlays, and user menu**

Port from:

- `screens.jsx`: `ProfileDashboard`.
- `workspace.jsx`: `Workspace`, `ImproveChatOverlay`, `EditDrawer`, `Field`, `UserMenu` if defined in imported files.

Implementation requirements:

- Workspace default tab is `profile`.
- Top nav includes Profile, Match, My resume, Grow, Activity.
- Settings is reachable through the user menu.
- Profile cards use demo data and open the edit drawer.
- Improve overlay supports section chips and composer.
- Logout calls the `onLogout` prop.

- [ ] **Step 4: Run workspace tests to verify they pass**

Run:

```bash
cd frontend && npm test -- --run src/components/Workspace.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace frontend/src/components/Workspace.tsx frontend/src/components/Workspace.test.tsx
git commit -m "feat: port prototype workspace shell"
```

---

## Task 6: Workspace Screens

**Files:**
- Create: `frontend/src/components/workspace/ResumeScreen.tsx`
- Create: `frontend/src/components/workspace/MatchScreen.tsx`
- Create: `frontend/src/components/workspace/GrowScreen.tsx`
- Create: `frontend/src/components/workspace/ActivityScreen.tsx`
- Create: `frontend/src/components/workspace/SettingsScreen.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Test: `frontend/src/components/workspace/WorkspaceScreens.test.tsx`

- [ ] **Step 1: Write failing workspace screen tests**

Create `frontend/src/components/workspace/WorkspaceScreens.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../../i18n/LangProvider";
import { Workspace } from "./Workspace";

function renderWorkspace() {
  render(
    <LangProvider>
      <Workspace user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }} onLogout={vi.fn()} />
    </LangProvider>,
  );
}

describe("workspace screens", () => {
  it("navigates to resume, match, grow, and activity screens", async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /my resume/i }));
    expect(screen.getByText(/your living resume site/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    expect(screen.getByText(/paste a jd/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^grow$/i }));
    expect(screen.getByText(/grow your craft/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /activity/i }));
    expect(screen.getByText(/activity/i)).toBeInTheDocument();
  });

  it("shows a deterministic match result after analyzing a JD", async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    await userEvent.type(screen.getByPlaceholderText(/job description|role you're aiming/i), "Frontend internship using React");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText(/match score/i)).toBeInTheDocument();
    expect(screen.getByText(/strengths/i)).toBeInTheDocument();
    expect(screen.getByText(/gaps/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run workspace screen tests to verify they fail**

Run:

```bash
cd frontend && npm test -- --run src/components/workspace/WorkspaceScreens.test.tsx
```

Expected: FAIL because the screens are not ported.

- [ ] **Step 3: Implement remaining workspace screens**

Port these prototype sections:

- `ResumeScreen` and version detail from `screens.jsx`.
- `MatchScreen` from `match.jsx`.
- `GrowScreen` from `grow.jsx`.
- `ActivityScreen` and `SettingsScreen` from `screens.jsx`.

Implementation requirements:

- Use demo fixture data.
- Keep interactions deterministic.
- Keep public page creation local to component state.
- Settings language control should use `LangToggle`; logout calls `onLogout`.

- [ ] **Step 4: Run workspace screen tests to verify they pass**

Run:

```bash
cd frontend && npm test -- --run src/components/workspace/WorkspaceScreens.test.tsx src/components/Workspace.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace frontend/src/fixtures/careerpalDemoData.ts
git commit -m "feat: port prototype workspace screens"
```

---

## Task 7: StageApp Integration And Regression Coverage

**Files:**
- Modify: `frontend/src/components/StageApp.tsx`
- Modify: `frontend/src/components/StageApp.test.tsx`
- Modify: `frontend/src/lib/api.test.ts`

- [ ] **Step 1: Add failing integration regressions**

Extend `frontend/src/components/StageApp.test.tsx`:

```tsx
it("loads existing users directly into the design-faithful workspace after login", async () => {
  const api = apiMock();
  render(<StageApp api={api} />);

  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
  await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
  await userEvent.click(screen.getByRole("button", { name: /log in/i }));

  await waitFor(() => expect(api.login).toHaveBeenCalledWith({ email: "alex@example.com", password: "secret123" }));
  await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
  expect(await screen.findByText(/profile completion/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /my resume/i })).toBeInTheDocument();
});

it("keeps API requests same-origin by default", () => {
  expect(defaultApiBaseUrl()).toBe("");
});
```

- [ ] **Step 2: Run integration tests to verify failures or current gaps**

Run:

```bash
cd frontend && npm test -- --run src/components/StageApp.test.tsx src/lib/api.test.ts
```

Expected: FAIL if StageApp has not been fully integrated with new components.

- [ ] **Step 3: Finalize StageApp adapter**

Implementation requirements:

- Wrap the rendered app in `LangProvider`.
- Maintain stages: `intro`, `login`, `signup`, `name`, `onboarding`, `app`.
- Store `{ name, initials, email, handle }` as the workspace user.
- On signup completion, call `api.register({ email, username, password })` where `username` is the email prefix sanitized to lowercase alphanumerics plus dashes.
- On name submit, call `api.patchProfile({ name })` if authenticated.
- On login, load profile and enter workspace without name/onboarding.
- Keep duplicate workspace-load protection from the walking skeleton.
- Keep `defaultApiBaseUrl()` returning `""`.

- [ ] **Step 4: Run full frontend unit tests**

Run:

```bash
cd frontend && npm test -- --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StageApp.tsx frontend/src/components/StageApp.test.tsx frontend/src/lib/api.test.ts
git commit -m "feat: integrate design shell with auth flow"
```

---

## Task 8: Browser Verification And Build

**Files:**
- No source edits expected unless verification finds defects.

- [ ] **Step 1: Run frontend build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

- [ ] **Step 2: Start the backend if it is not running**

Run:

```bash
curl -s -f http://127.0.0.1:8000/api/health || (cd backend && nohup uvicorn app.main:app --reload --port 8000 > /tmp/careerpal-backend.log 2>&1 &)
```

Expected: health endpoint returns success after startup.

- [ ] **Step 3: Start the frontend**

Run:

```bash
cd frontend && npm run dev -- --hostname 0.0.0.0 --port 3001
```

Expected: Next dev server starts on port 3001.

- [ ] **Step 4: Verify main screens in browser**

Open `http://127.0.0.1:3001` and check:

- Intro screen renders with hero card and Slime brand.
- Sign in screen renders centered card.
- Signup screen renders three-step verification flow.
- Name screen renders companion prompt.
- Onboarding screen renders chat and side knowledge panel.
- Workspace profile tab renders top nav and profile cards.
- My resume, Match, Grow, Activity, and Settings tabs render without blank screens.
- Improve overlay and edit drawer open and close.
- No major text overlap at desktop width and mobile width.

- [ ] **Step 5: Run API proxy login smoke test**

Run:

```bash
curl -s -i -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"secret123"}' | sed -n '1,12p'
```

Expected: HTTP 200 with a JSON auth response if the test account exists.

- [ ] **Step 6: Commit verification fixes if any**

If source defects were fixed during verification:

```bash
git add frontend
git commit -m "fix: polish design shell verification issues"
```

If no source defects were found, do not create an empty commit.

