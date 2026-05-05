# CareerPal Design-Faithful Frontend Shell Design

## Goal

Rebuild the current frontend shell so the user interaction and page design strictly follow the design bundle in `docs/careerpal/project`. This phase makes the production Next.js frontend look and behave like the polished prototype before deeper backend functionality is added.

The current frontend remains useful as a walking skeleton, but it is not the product UI. After this phase, the app should feel like the design bundle from first load through workspace navigation.

## Source Of Truth

Primary source:

- `docs/careerpal/project/CareerPal.html`

Imported prototype files that must be followed:

- `i18n.jsx`: bilingual copy and language toggle behavior.
- `slime.jsx`: companion SVG states and animation behavior.
- `data.jsx`: sample profile, match, growth, and activity data.
- `intro.jsx`: landing/intro page.
- `auth.jsx`: login, signup, name, onboarding, knowledge panel.
- `screens.jsx`: profile dashboard, resume, settings, activity, shared app screens.
- `match.jsx`: match flow.
- `grow.jsx`: grow flow.
- `workspace.jsx`: app shell, nav, improve overlay, edit drawer.
- `styles.css`: visual tokens, layout, spacing, typography, component states, responsive rules.

If the design bundle conflicts with `docs/SPEC.md`, the design bundle wins for this frontend phase unless the behavior is impossible or clearly fake prototype behavior. Functional gaps are recorded as future slices instead of silently redesigning.

## Product Scope

This phase covers the frontend shell only:

- Intro page.
- Login and signup screens.
- Name capture.
- Onboarding chat with side knowledge panel.
- Workspace app shell.
- Profile dashboard.
- Resume page.
- Match page.
- Grow page.
- Activity page.
- Settings page.
- Improve chat overlay.
- Edit drawer.
- Language toggle.
- Slime companion visuals and states.

This phase does not implement production LLM behavior, resume parsing, public hosting, PDF export, or persisted structured career entities. Those are later functional phases.

## Interaction Flow

The stage machine follows the prototype:

1. `intro`
   - Brand, nav, language toggle, sign in, get started.
   - CTA routes to signup.
   - Sign in routes to login.

2. `login`
   - Centered card, slime visual, email/password fields.
   - Successful login with existing account enters `app`.

3. `signup`
   - Multi-step account flow: email verification, password setup, phone binding, completion.
   - Verification-code sending is simulated in this phase because no backend verification service exists.
   - Completion creates/registers the backend account where possible, then enters `name`.

4. `name`
   - Companion asks what to call the user.
   - Name and initials are stored in frontend state and sent to the existing profile API if authenticated.

5. `onboarding`
   - Chat-first layout with app bar, skip action, side knowledge panel, message stream, option pills, file attachment affordance, and composer.
   - Deterministic prototype prompts are preserved.
   - Answers update local knowledge progress.
   - File attachment records the selected filename only; real parsing is future work.

6. `app`
   - Workspace shell with top nav: Profile, Match, My resume, Grow, Activity.
   - User menu exposes settings and logout.
   - Profile cards open the edit drawer.
   - Improve via chat opens the overlay.

## Visual Design Requirements

The production frontend must port the prototype visual system closely:

- Light theme with `#5367F3` companion/accent.
- White, tinted off-white, and soft neutral backgrounds from `styles.css`.
- Serif display typography using Fraunces or an equivalent loaded web font, with Inter for UI text.
- Bilingual EN/ZH copy from `i18n.jsx`.
- Rounded pills, restrained cards, thin hairline borders, and the prototype shadows.
- Sticky app/intro bars where shown in the prototype.
- Full-height app shell with internal scroll regions.
- Animated Slime SVG states for listening, thinking, speaking/answering, and waiting.
- Prototype button, input, option pill, chip, modal, drawer, composer, card, and tab states.

No alternative design system should be introduced in this phase. If a production component is needed, it should be styled to match the prototype rather than replacing the prototype look.

## Data Strategy

Use a thin adapter layer so UI components can render from either:

- existing backend auth/profile responses, or
- prototype sample data from `data.jsx` while the backend lacks a matching entity.

Rules:

- Auth must use the existing backend login/register endpoints.
- Profile name/email should use backend data when available.
- Workspace sections can use sample data until structured backend entities exist.
- Demo-only values must be centralized in a frontend fixture module so later slices can replace them cleanly.
- Components should not call backend APIs directly; they receive state and callbacks from the stage/app container.

## Backend Use In This Phase

Keep backend changes minimal:

- Continue using auth endpoints.
- Continue using profile fetch/update for available fields.
- Do not add structured profile tables in this phase unless implementation is blocked without them.

The backend can return less data than the UI shows. The frontend shell may fill missing sections with prototype fixtures until the real functional phases begin.

## Testing Strategy

This phase follows TDD.

Unit/component tests:

- Stage flow: intro -> signup -> name -> onboarding -> app.
- Existing login path: login -> app.
- Signup step validation and simulated code flow.
- Name capture updates state and profile callback.
- Onboarding option/text/file interactions add messages and update knowledge progress.
- Workspace nav switches between Profile, Match, My resume, Grow, Activity, Settings.
- Profile section click opens edit drawer.
- Improve button opens overlay and section chips change prompts.
- Language toggle changes visible copy.
- API client remains same-origin safe.

Visual/browser verification:

- Run the Next app locally.
- Use browser checks or Playwright screenshots for intro, auth, onboarding, profile, resume, match, grow, activity, and settings.
- Verify no blank screens, broken assets, overlapping major UI, or unusable mobile layout.

Backend tests only run if backend code changes.

## Implementation Approach

Recommended approach: port the prototype into production React components, preserving behavior and styling, while wrapping it with real auth/profile integration.

Alternatives considered:

- Patch the current walking-skeleton components incrementally. This is lower churn but risks continuing to diverge from the design bundle because the current structure is not the same interaction model.
- Copy the prototype almost verbatim into Next. This gives quick visual parity but creates weak production boundaries and makes later API integration harder.

The recommended approach is a structured port: create production modules that mirror the prototype screens and data model, with tests around behavior and flow.

## Component Boundaries

Expected frontend modules:

- `StageApp`: owns auth/session stage transitions and backend integration.
- `LangProvider` and `useLang`: owns language state and copy lookup.
- `Slime`: production version of the prototype companion SVG.
- `IntroPage`: landing screen.
- `AuthScreens`: login, signup, name capture.
- `Onboarding`: onboarding chat and knowledge panel.
- `Workspace`: shell, navigation, user menu, overlays.
- `ProfileDashboard`, `ResumeScreen`, `MatchScreen`, `GrowScreen`, `ActivityScreen`, `SettingsScreen`: workspace screens.
- `fixtures/careerpalDemoData`: centralized sample data adapted from the design bundle.

## Explicit Prototype Exceptions

These prototype behaviors are allowed to remain simulated in this phase:

- Email verification code delivery.
- Phone verification code delivery.
- Resume file parsing.
- AI response generation.
- Match scoring logic.
- Growth roadmap generation logic.
- Public page creation and hosting.
- PDF/Word export.
- Saving edit drawer changes beyond currently supported profile fields.

They must still look and behave like the prototype from the user's perspective, but persistence and intelligence can be deterministic placeholders.

## Acceptance Criteria

- The first screen and core flows visually match the design bundle closely enough that the design bundle is recognizable as the direct source.
- User can complete intro -> signup -> name -> onboarding -> workspace.
- User can login with the existing test account and land in workspace.
- User can navigate all workspace tabs shown in the prototype.
- User can open and close improve overlay and edit drawer.
- Language toggle works for implemented screens.
- Frontend tests pass.
- Frontend build passes.
- Browser verification passes for the main screens.

