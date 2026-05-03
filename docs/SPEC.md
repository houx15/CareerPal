# CareerPal — Product & Technical Specification

**Version:** 1.0
**Date:** May 2026
**Status:** Ready for Design & Development

---

## 1. Product Overview

### 1.1 What Is CareerPal

CareerPal is an AI-powered career development companion for students. It helps them structure, refine, and showcase their professional experience through conversation — not forms.

The core output is an **interactive personal page** — a living, shareable representation of who the student is professionally. It can also export to traditional PDF/Word formats for backward compatibility.

### 1.2 Core Value Proposition

- **For students:** "Come in with scattered experience, leave with a polished, shareable professional profile and a clear growth plan."
- **Differentiation:** This is not a website builder. This is not a form-based resume tool. It is a career companion that understands you through conversation and produces something better than you could make alone.

### 1.3 Design Philosophy

- **Focused UI:** Open the app → AI says hi → you know what to do. No dashboards, no navigation menus, no feature overload.
- **AI feeling over AI features:** The value comes from conversational flow, not checkboxes. No forms. The AI leads, the student follows naturally.
- **The resume, redefined:** In the AI era, a resume should be interactive and alive — not a static PDF. But it is still fundamentally a resume, not a random webpage. All AI interactions are bounded to the career/resume context.

### 1.4 Target User

University students (undergrad and grad) preparing for internships and entry-level jobs.

---

## 2. Product Phases

Each phase delivers a complete value loop — not a half-product.

### Phase 1: Build & Show

Conversational onboarding → structured profile data → interactive personal page + PDF export.

**Value loop:** You come in, you get a better resume and showcase page than you could make yourself.

### Phase 2: Match

Paste a JD → AI analyzes match score, gaps, and suggests resume adjustments for that specific role.

**Value loop:** You have a targeted action plan for a specific opportunity.

### Phase 3: Grow

Based on gap analysis, AI generates a skill tree / growth roadmap with actionable steps.

**Value loop:** You know what to do next. You come back, update your profile, and your page grows richer.

---

## 3. User Journey — Phase 1 (Detailed)

### 3.1 Entry

User opens the app. Full-screen conversational interface. AI speaks first:

> "Hey, I'm your career planning companion. Before we get started, I'd like to get to know you. Do you have a resume you can share with me?"

Two clear options presented:
- **Upload Resume** (supports PDF and Word)
- **I don't have one yet**

### 3.2 Path A — Has Resume

1. User uploads file (PDF or Word).
2. Brief processing animation.
3. AI confirms what it understood: "Got it — you're a junior CS student at XX University, you did an internship at XX and have two projects. Let me confirm a few things..."
4. AI asks targeted follow-up questions about vague or missing areas.
5. As each section is confirmed, the corresponding node in the structure visualization lights up.

### 3.3 Path B — No Resume

1. AI says: "No problem, let's start from scratch. Tell me a bit about yourself first."
2. Lightweight questions appear using a mix of **selectable options + text input**:
   - Current status? → `Undergrad` / `Master's` / `Graduated` / `Other`
   - School and major? → text input
   - Year? → `Freshman` / `Sophomore` / `Junior` / `Senior`
3. After basics, AI goes deeper: "Have you done any internships?" "Any course projects you're proud of?"
4. Conversation-driven data collection continues until a baseline profile is established.

### 3.4 Paths Converge — Structure Visualization

Once enough data is collected, a geometric structure visualization appears on screen. It doesn't pop up suddenly — it grows naturally as data accumulates.

The visualization communicates:
- **Completeness:** Which sections are filled vs. which are empty/sparse.
- **Relationships:** Connections between skills and projects/experiences.
- **Current focus:** Which node the conversation is currently exploring.
- **Overall richness:** At a glance, how full is this person's profile.

Nodes are clickable — tapping a node shifts the conversation to that topic. The student can also continue chatting freely, or say "that's enough for now, show me my page."

### 3.5 Page Generation

AI generates an interactive HTML/CSS page based on:
- The structured profile data
- A style template (user can choose from 3 built-in styles)

The page is previewed in-app. User can iterate through conversation:
- "Make the projects section more prominent"
- "Switch to a warmer color palette"
- "I like it, give me the link"

Page is hosted at `careerpal.com/{username}` (or equivalent domain). User can toggle public/private in settings.

### 3.6 PDF/Word Export

At any time, user can export a traditional resume:
- Same structured data, rendered in a conventional resume format
- Clean, ATS-friendly layout
- One-click download

### 3.7 Return Visits

When a user comes back:
- AI knows their current profile state (loaded from database, injected into prompt)
- Visualization shows current completeness
- User can pick up where they left off — add a new project, update an experience, regenerate the page
- The page grows richer over time

---

## 4. Feature List — Phase 1

| Feature | Description |
|---------|-------------|
| User Registration & Login | Email + password. Username set during registration. |
| Resume Upload & Parsing | Accept PDF and Word. Extract text → LLM structures it. |
| Conversational Onboarding | AI-guided data collection via questions, options, and free text. |
| Structured Profile Data | Normalized data store for all career information. |
| Structure Visualization | Geometric node-based view of profile completeness and relationships. |
| Interactive Page Generation | AI generates full HTML/CSS page from profile data + style template. |
| Page Customization via Chat | Dedicated conversation for page styling/layout adjustments. |
| Page Hosting | Public URL at `careerpal.com/{username}`, toggleable public/private. |
| PDF Export | Traditional resume format, ATS-friendly, one-click download. |
| Style Templates | 3 built-in visual styles for the interactive page. |

---

## 5. Interaction Design Principles

### 5.1 Focused Interface

The primary screen is a **conversation panel**. The structure visualization appears alongside it once data begins accumulating. There is no top navigation, no sidebar menu, no dashboard. The AI tells you what to do next.

### 5.2 Conversation Components

Conversations use a mix of interaction types (driven by LLM as a skill — the AI decides the best format per question):

- **Selectable options:** For categorical choices (year, degree type, skill level)
- **Text input:** For open-ended responses (describe your project, what did you learn)
- **Hybrid:** Options with an "Other" text field
- **File upload:** Inline in conversation for resume upload

### 5.3 Two Conversation Contexts

| Context | Role | Trigger | Post-processing |
|---------|------|---------|-----------------|
| Career Conversation | Career planning companion | Default, node clicks, "add experience" | Extraction → update profile DB |
| Page Conversation | Page design assistant | "Customize my page", style change requests | Re-generate HTML page |

These are separate conversation threads with different system prompts. They share the same underlying conversation engine.

### 5.4 Visualization Behavior

- Nodes can be clicked to expand into sub-nodes (e.g., Education → specific schools)
- Clicking a node opens the career conversation focused on that topic
- Visual states: filled (complete), partial (has data but could be richer), empty (no data yet)
- The specific geometric form (constellation, honeycomb, radial, etc.) is a **design decision** — the spec defines the functional semantics, not the visual style

---

## 6. Structured Data Schema

Every content node includes a `comment` field — annotations from AI or the user that provide context beyond the raw data (e.g., "This project is great for demonstrating system design skills").

### 6.1 Core Entities

**User**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | string | Unique |
| password_hash | string | |
| username | string | Unique, set at registration, used in public URL |
| created_at | timestamp | |
| updated_at | timestamp | |

**Profile**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| name | string | |
| phone | string | Optional |
| contact_email | string | May differ from login email |
| headline | string | One-line self description |
| target_direction | string | What they want to do (e.g., "Backend SWE", "Product Design") |
| comment | text | AI/user notes on overall profile |

**Education**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → Profile |
| school | string | |
| major | string | |
| degree | string | e.g., B.S., M.S. |
| start_date | date | |
| end_date | date | Nullable (current) |
| gpa | decimal | Optional |
| core_courses | JSON | Array of course names |
| completeness | enum | complete / partial / sparse |
| comment | text | |
| sort_order | integer | Display ordering |

**Experience**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → Profile |
| company | string | |
| role | string | |
| start_date | date | |
| end_date | date | Nullable |
| description | text | What they did |
| achievements | JSON | Array of quantifiable outcomes |
| comment | text | |
| completeness | enum | complete / partial / sparse |
| sort_order | integer | |

**Project**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → Profile |
| name | string | |
| description | text | |
| tech_stack | JSON | Array of technologies |
| achievements | JSON | Quantifiable outcomes |
| link | string | Optional URL |
| comment | text | |
| completeness | enum | complete / partial / sparse |
| sort_order | integer | |

**Skill**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → Profile |
| name | string | |
| category | string | e.g., "Programming", "Design", "Language" |
| proficiency | enum | beginner / intermediate / advanced / expert |
| comment | text | |

**Certificate**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → Profile |
| name | string | |
| issuer | string | |
| date | date | |
| comment | text | |

### 6.2 Conversation & Generation Entities

**Conversation**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| context_type | enum | career / page |
| messages | JSON | Array of {role, content, timestamp} |
| focus_node | string | Optional — which profile section this convo is about |
| created_at | timestamp | |
| updated_at | timestamp | |

**GeneratedPage**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| html_content | text | Full HTML/CSS code |
| style_template | string | Which of the 3 templates was used |
| version | integer | Auto-incrementing per user |
| is_public | boolean | Default false |
| created_at | timestamp | |

**ResumeFile**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| file_url | string | OSS path to original uploaded file |
| file_type | enum | pdf / docx |
| parsed | boolean | Whether extraction is complete |
| created_at | timestamp | |

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js (React) | SPA, standalone deployment |
| Backend | Python + FastAPI | REST API, monolith |
| Database | PostgreSQL | Single instance for Phase 1 |
| Object Storage | Alibaba Cloud OSS | Resume files, generated PDFs |
| LLM | Configurable (see 7.3) | Abstraction layer, not vendor-locked |
| Streaming | SSE (Server-Sent Events) | For real-time conversation streaming |
| Deployment | Alibaba Cloud ECS | Frontend and backend deployed separately |

### 7.2 Architecture Diagram

```
┌──────────────┐         ┌──────────────────────────────────────────┐
│              │  REST   │  FastAPI Backend                         │
│   Next.js    │  + SSE  │                                         │
│   Frontend   │◄───────►│  ┌─────┐ ┌────────┐ ┌──────┐ ┌──────┐  │
│              │         │  │Auth │ │Convers.│ │Resume│ │Page  │  │
│              │         │  └─────┘ └────────┘ └──────┘ └──────┘  │
│              │         │  ┌─────────┐ ┌──────────────────────┐   │
│              │         │  │Profile  │ │LLM Abstraction Layer │   │
│              │         │  └─────────┘ └──────────────────────┘   │
└──────────────┘         └──────────┬──────────────┬───────────────┘
                                    │              │
                              ┌─────┴─────┐  ┌─────┴─────┐
                              │PostgreSQL │  │Alibaba OSS│
                              └───────────┘  └───────────┘
```

### 7.3 LLM Abstraction Layer

The LLM layer is provider-agnostic. Configuration per task:

| Config Field | Example |
|-------------|---------|
| api_format | `openai` or `anthropic` |
| base_url | `https://api.openai.com/v1` |
| model_name | `gpt-4o` |
| api_key | `sk-...` |

Different tasks can use different model configurations. For Phase 1, a single model with different prompt strategies is sufficient, but the architecture supports per-task model routing from day one.

Supported API formats:
- **OpenAI-compatible:** Covers OpenAI, DeepSeek, Qwen, local models via vLLM/Ollama, and most other providers
- **Anthropic:** Claude models

The adapter layer translates between the internal message format and the provider-specific request/response format.

### 7.4 Extraction Pipeline

**Hybrid strategy — real-time light extraction + end-of-session reconciliation:**

1. **During conversation:** After each AI response, a lightweight extraction call identifies any explicitly stated new data (e.g., user said "I interned at Google last summer" → update experience table). This enables the visualization to update in near-real-time.

2. **End of session:** When the user leaves or pauses for a threshold duration, a comprehensive extraction call reviews the full conversation and reconciles all data — catching nuances, implied information, and corrections that the per-message extraction might miss.

Both extraction calls use the same LLM with a specialized extraction prompt that outputs structured JSON matching the database schema.

---

## 8. Backend Modules

### 8.1 Auth Module

Handles user registration, login, session management.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account with email, password, username |
| `/api/auth/login` | POST | Email + password login, returns session token |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/auth/me` | GET | Get current user info |

### 8.2 Resume Module

Handles file upload, text extraction, and LLM-based parsing.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resume/upload` | POST | Upload PDF/Word file → store in OSS → trigger parsing |
| `/api/resume/parse-status/{id}` | GET | Poll parsing progress |
| `/api/resume/parsed/{id}` | GET | Get structured result of parsing |

**Parsing pipeline:** Upload → OSS storage → text extraction (pymupdf for PDF, python-docx for Word) → LLM structuring → write to profile tables.

### 8.3 Profile Module

CRUD for all structured profile data.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | GET | Full profile with all sub-entities |
| `/api/profile` | PATCH | Update basic profile info |
| `/api/profile/{entity}` | POST | Add new item (entity = education / experience / project / skill / certificate) |
| `/api/profile/{entity}/{id}` | PATCH | Update specific item |
| `/api/profile/{entity}/{id}` | DELETE | Remove specific item |
| `/api/profile/completeness` | GET | Completeness status of all nodes (for visualization) |

### 8.4 Conversation Module

Manages conversation sessions and streams AI responses.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversation/start` | POST | Start new conversation. Params: `context_type` (career/page), optional `focus_node` |
| `/api/conversation/message` | POST | Send user message, returns SSE stream of AI response |
| `/api/conversation/history` | GET | List past conversation sessions |
| `/api/conversation/{id}` | GET | Get full conversation by ID |

**Message flow:**
1. Receive user message
2. Load current profile data from DB
3. Assemble system prompt (role + profile context + focus area)
4. Call LLM with streaming enabled
5. Stream tokens to frontend via SSE
6. After response completes, trigger real-time extraction
7. Update profile DB with extracted data
8. Return extraction diff to frontend (so visualization can update)

### 8.5 Page Module

Generates and manages the interactive HTML page.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/page/generate` | POST | Generate page from current profile + selected style |
| `/api/page/preview` | GET | Get latest page HTML |
| `/api/page/customize` | POST | Send customization instruction, returns SSE stream + regenerated page |
| `/api/page/versions` | GET | List all generated versions |
| `/api/page/settings` | PATCH | Toggle public/private |
| `/api/page/export/pdf` | GET | Render current page to PDF and return download URL |

### 8.6 Public Module

Serves the public-facing profile page.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/p/{username}` | GET | Serve the generated HTML page (if public or with valid share link) |

---

## 9. LLM Prompt Strategy

### 9.1 Career Conversation Prompt

**Role:** Career planning companion.

**System prompt structure:**
```
You are a career planning companion for university students.

Your current student's profile:
{full structured profile JSON}

Sections that need more information:
{list of incomplete/sparse sections}

Current conversation focus: {focus_node or "general"}

Your goals:
- Help the student articulate and refine their experiences
- Ask specific, targeted questions — not generic advice
- Use a mix of options and open-ended questions
- When the student describes an experience, probe for: what they did, what impact it had, what they learned, any quantifiable outcomes
- Never fabricate information — only work with what the student tells you
- Keep the tone warm and encouraging, like a supportive mentor

Interaction format:
- You may present selectable options for categorical questions
- Use free-text prompts for descriptive questions
- You may combine both in a single turn
```

### 9.2 Extraction Prompt

**Role:** Structured data extractor.

**System prompt structure:**
```
You are a data extraction engine. Given a conversation snippet between a career companion and a student, extract any new or updated profile information.

Current profile state:
{current profile JSON}

Recent conversation:
{last N messages}

Output a JSON object with only the fields that should be created or updated.
Use this exact schema:
{schema definition}

Rules:
- Only extract information the student explicitly stated
- Never infer or fabricate data
- If the student corrected previous information, output the correction
- Include a "comment" field when the student provides context that doesn't fit structured fields
- Set "completeness" to "complete" if the entry has role + description + achievements, "partial" if missing one, "sparse" if missing multiple
```

### 9.3 Page Generation Prompt

**Role:** Web page designer.

**System prompt structure:**
```
You are a web designer creating a personal profile page.

Student profile data:
{full structured profile JSON}

Style reference:
{HTML/CSS example for the selected template}

Rules:
- Generate a complete, self-contained HTML page with inline CSS
- Only use information from the provided profile data — never invent content
- The page must be responsive (mobile + desktop)
- Follow the visual style of the reference closely
- Structure: header with name/headline, then sections for education, experience, projects, skills, certificates — only include sections that have data
- Each section should be engaging and visually distinct, not a plain list
- Include subtle interactions (hover effects, smooth scrolls) but no JavaScript frameworks
```

### 9.4 Page Customization Prompt

**Role:** Web page design assistant.

**System prompt structure:**
```
You are a web design assistant helping customize a personal profile page.

Current page HTML:
{current HTML code}

Student profile data:
{profile JSON}

User's customization request:
{user message}

Rules:
- Modify the HTML/CSS to fulfill the request
- Stay within the bounds of a personal profile page — do not create unrelated content
- Maintain responsiveness
- Output the complete modified HTML page
- If the request is outside the scope of a profile page, politely redirect
```

---

## 10. Style Templates

Three built-in styles for Phase 1. The following are **direction briefs for the design team** — they will produce the actual HTML/CSS reference files.

### Template 1: Clean Professional

Minimal, high-contrast. Lots of whitespace. Monospace accents. Feels like a well-typeset document. Best for traditional industries, business roles.

### Template 2: Modern Creative

Bold colors, card-based layout, subtle animations on scroll. Geometric accents. Feels like a portfolio site. Best for design, product, creative roles.

### Template 3: Technical

Dark mode option, code-inspired typography, skill bars and project cards with tech stack tags prominently displayed. Feels like a developer portfolio. Best for engineering roles.

---

## 11. Object Storage (OSS) Structure

```
careerpal-bucket/
├── resumes/
│   └── {user_id}/
│       └── {file_id}.{pdf|docx}        # Original uploaded files
├── pages/
│   └── {user_id}/
│       └── v{version}.html              # Generated page versions
└── exports/
    └── {user_id}/
        └── resume_{timestamp}.pdf       # Exported PDF files
```

---

## 12. Deployment

### 12.1 Infrastructure

| Component | Deployment |
|-----------|-----------|
| Frontend (Next.js) | ECS instance, served via Nginx |
| Backend (FastAPI) | ECS instance, run via Uvicorn behind Nginx |
| PostgreSQL | Self-hosted on ECS or Alibaba Cloud RDS |
| OSS | Alibaba Cloud OSS |
| Domain | careerpal.com (or equivalent) |

### 12.2 Environment Configuration

```
# LLM Configuration (per task, shown for single model setup)
LLM_API_FORMAT=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL_NAME=gpt-4o
LLM_API_KEY=sk-xxx

# Database
DATABASE_URL=postgresql://user:pass@host:5432/careerpal

# OSS
OSS_ACCESS_KEY=xxx
OSS_SECRET_KEY=xxx
OSS_BUCKET=careerpal-bucket
OSS_ENDPOINT=oss-cn-xxx.aliyuncs.com

# App
APP_SECRET_KEY=xxx
FRONTEND_URL=https://careerpal.com
```

---

## 13. Open Items for Design Team

1. **Structure Visualization:** Define the geometric visual form. Input: node types (education, experience, project, skill, certificate, profile), node states (complete, partial, sparse, empty), node relationships. Output: interactive component spec.

2. **Style Templates:** Produce 3 complete HTML/CSS reference pages based on the direction briefs in Section 10. These will be used as few-shot examples for the LLM.

3. **Conversation UI Components:** Design the mixed-input conversation interface — how options, text fields, and file uploads appear inline in the chat flow.

4. **Page Preview Experience:** How the generated page appears in-app for review before publishing. Inline iframe? Side panel? Full-screen preview?

5. **Onboarding Flow Visuals:** The first-open experience — how the AI greeting and initial options are presented.

---

## 14. Open Items for Development Team

1. **Session Management:** Choose token strategy (JWT vs. server-side sessions) for auth.

2. **SSE Implementation:** Define reconnection and error handling strategy for conversation streaming.

3. **Extraction Reliability:** Build validation layer to ensure LLM extraction output matches schema before DB writes. Handle malformed outputs gracefully.

4. **PDF Export Engine:** Evaluate Playwright (headless Chromium) vs. WeasyPrint for HTML→PDF rendering. Key criterion: visual fidelity to the HTML page.

5. **Rate Limiting:** Define per-user limits for LLM calls (conversations, page generations, exports) to manage cost.

6. **Conversation History Pruning:** Define strategy for context window management when conversations get long — summarization vs. sliding window vs. selective injection.

---

## 15. Success Metrics — Phase 1

| Metric | What It Tells Us |
|--------|-----------------|
| Onboarding completion rate | Do students finish the initial profile building? |
| Profile completeness distribution | How full are profiles on average? |
| Page generation rate | What % of users generate an interactive page? |
| Page share rate | Do users actually share their page URL? |
| Return visit rate | Do users come back to update their profile? |
| PDF export rate | Is the traditional format still needed? |
| Conversation depth | How many turns before users feel "done"? |
