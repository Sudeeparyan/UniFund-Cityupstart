# UniMind — CLAUDE.md

This file is the single source of truth for Claude Code in this project.
**Always read this file at the start of every session before making any changes.**

---

## Project Identity

**UniMind** is an agentic web platform where each user gets a personal AI agent built from their knowledge and life experiences. Agents form a 3D network. Running a "life simulation" queries the collective intelligence of all agents to predict the user's future paths.

**One-line pitch:** The first AI that reasons about your future using your past — and the lived experience of thousands of real humans who walked similar paths.

---

## Repository Structure

```
unimind-react/               ← git root (do NOT rename this folder)
├── CLAUDE.md                ← this file (always update after changes)
├── .gitignore
├── frontend-react/          ← React 18 + Vite + Three.js frontend
├── backend-python/          ← FastAPI + SQLite + Azure OpenAI backend
└── docs/                    ← All documentation
    ├── idea.md              ← Original product vision
    ├── improvements.md      ← Gap analysis vs. idea
    ├── frontend.md          ← Complete frontend technical reference
    ├── api-reference.md     ← All API endpoints with request/response
    ├── architecture.md      ← System diagram and data flow
    └── setup.md             ← How to run locally
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React | 18.3.1 |
| Frontend build | Vite | 5.3.1 |
| Frontend 3D | Three.js | 0.128.0 |
| Frontend animation | Framer Motion | 10.18.0 |
| Frontend styles | Tailwind CSS | 3.4.3 |
| Backend | FastAPI | 0.111.0 |
| Backend server | uvicorn | 0.29.0 |
| Backend DB | SQLite (aiosqlite) | 0.20.0 |
| Backend auth | python-jose + passlib | JWT, bcrypt==4.0.1 |
| AI | Azure OpenAI (AsyncAzureOpenAI) | openai==1.30.0 |

---

## How to Run

### Backend
```bash
cd backend-python

# First time only
pip install -r requirements.txt
python seed_data/run_seed.py

# Every time
python -m uvicorn main:app --reload --port 8000
```
Backend: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend-react
npm install   # first time
npm run dev
```
Frontend: http://localhost:5173

---

## Current State of the Project (as of 2026-05-26)

### What Is Built and Working

#### Frontend Pages (in `frontend-react/src/pages/`)
| Page | Status | Description |
|---|---|---|
| `LoginPage.jsx` | ✅ Complete | Email/password login, stores JWT to localStorage — **currently bypassed** |
| `SignupPage.jsx` | ✅ Complete | Name/email/password signup — **currently bypassed** |
| `ChatbotPage.jsx` | ✅ Complete | AI knowledge interview. File upload (PDF/DOCX/TXT/image). Content Enhancer (✦). Per-message delete. Clear history. XP gamification. |
| `OnboardingPage.jsx` | ✅ Complete | Chat-style adaptive questionnaire + 3D particle morphing. Q2 adapts based on Q1 answer. Passes `answers` to App. |
| `AgenticWebPage.jsx` | ✅ Complete | 3D network visualization of 1,401 agents. Simulation fires concurrently with animation. Navigation to Timeline, Community, Runway, Chatbot. |
| `TimelinePage.jsx` | ✅ Complete | 3 LLM-generated life path cards. ContextQualityBanner (signal strength). ChatbotCTA. "Enrich Agent" button returns to chatbot then agentic. |
| `CommunityPage.jsx` | ✅ Complete | Full rewrite. AnimatedNumber, real ProfileCard (score + badges from API), FeaturedStoriesBar, SortSelector (Hot/New/Top/Rising), TrendingSection (API), SuggestedConnections. |
| `RunwayPage.jsx` | ✅ Complete | Developer financial runway tracker (client-side). Income sources, expense categories, monthly chart, AI insights, dev deals. |

#### App Routing (`frontend-react/src/App.jsx`)
Page state machine: `'onboarding'` → `'transitioning'` → `'agentic'` → `'timeline'` | `'community'` | `'runway'` | `'chatbot'`

- **Auth bypassed** — app starts directly at `'onboarding'`. Login/signup pages exist but are commented out.
- All pages except Login/Signup use `React.lazy()` + `<Suspense>` for code splitting
- `simulationData` + `simulationKnowledgeCount` flow from AgenticWebPage → TimelinePage
- `chatbotCompleteTarget` controls where chatbot returns (`'onboarding'` for new users, `'agentic'` for returning)
- `handleEnter(answers)` non-blockingly saves onboarding answers, then runs cinematic transition

#### API Layer (`frontend-react/src/lib/api.js`)
Single file for all fetch calls. Reads JWT from `localStorage` key `unimind_token`. Base URL: `http://localhost:8000`.

#### Backend Endpoints
All endpoints live in `backend-python/routers/`. See `docs/api-reference.md` for full details.

| Endpoint | Status |
|---|---|
| POST /api/auth/signup | ✅ |
| POST /api/auth/login | ✅ |
| GET /api/users/me | ✅ (includes posts_count) |
| POST /api/users/me/onboarding | ✅ |
| GET /api/agents | ✅ |
| GET /api/agents/search?q= | ✅ |
| POST /api/simulate | ✅ (structured JSON: 3 paths + collective_insight) |
| GET /api/posts | ✅ |
| GET /api/posts/trending | ✅ |
| POST /api/posts | ✅ |
| POST /api/posts/{id}/react | ✅ |
| GET /api/leaderboard | ✅ |
| GET /api/network/growth | ✅ |
| GET /api/achievements/{user_id} | ✅ |
| POST /api/chatbot/message | ✅ (Azure OpenAI, returns message id) |
| GET /api/chatbot/history | ✅ (returns ids) |
| DELETE /api/chatbot/history | ✅ (clear all, re-seeds opening) |
| DELETE /api/chatbot/history/{id} | ✅ (delete one, ownership check) |
| POST /api/chatbot/enhance | ✅ (AI expands brief input with context) |
| POST /api/chatbot/upload | ✅ (PDF/DOCX/image/txt extraction) |
| POST /api/chatbot/knowledge | ✅ |

#### Backend Services
- `services/agent_seed.py` — Python port of frontend's `xorshift32` RNG. Builds 1,401 agents at startup in memory. **Validated: ARIA=9842, NOX=9120, VEDA=8633.**
- `services/azure_openai.py` — `AsyncAzureOpenAI` wrapper. Two functions: `chat_complete()` and `simulate_life()`.
- `services/chatbot_service.py` — System prompt builder, knowledge extraction, agent bio rebuild. Also: `enhance_content()` and `extract_text_from_file()` (PDF/DOCX/image/text).

#### Database (SQLite — `backend-python/unimind.db`)
Tables: `users`, `knowledge_chunks`, `chat_messages`, `posts`, `reactions`, `achievements`

Seeded with 10 community posts matching the frontend's original `INITIAL_POSTS` array exactly.

### What Is NOT Yet Built

| Feature | Notes |
|---|---|
| Live activity WebSocket | `CommunityPage` live feed is still hardcoded (updates every 4s client-side) |
| Node journey view | Clicking a node shows tooltip. Full journey view (described in `idea.md`) not built |
| 3D timeline (Simulation Studio) | Month-by-month cinematic view described in `idea.md` is not built |
| Real agent profiles in 3D network | Network still uses procedural data. Real user agents not injected into the Three.js scene |
| LLM-driven onboarding | Onboarding uses adaptive question tree (Q2 adapts to Q1) but does NOT call an LLM per question — that requires a new `/api/onboarding/chat` endpoint |

---

## Azure OpenAI Config

Credentials live in `backend-python/.env` (NOT committed to git):
```
AZURE_ENDPOINT=https://laya.cognitiveservices.azure.com/
AZURE_API_VERSION=2024-12-01-preview
DEPLOYMENT_NAME=gpt-5-chat
```

The `OPENAI_API_KEY` is in `.env`. Never log it or commit it.

---

## Key Files to Know

| File | Purpose |
|---|---|
| `frontend-react/src/App.jsx` | Central router. Add new pages here. |
| `frontend-react/src/lib/api.js` | ALL API calls go through here. Never use fetch() directly in pages. |
| `backend-python/main.py` | FastAPI app factory. Add new routers here. |
| `backend-python/db.py` | SQLite schema + `get_db()` dependency. |
| `backend-python/auth.py` | JWT + bcrypt. `get_current_user` dependency. |
| `backend-python/services/agent_seed.py` | CRITICAL: xorshift32 RNG. Do not modify without validating against frontend JS output. |
| `backend-python/services/azure_openai.py` | Azure OpenAI client. |
| `backend-python/.env` | Secrets. Never commit. |

---

## Rules for Claude (Mandatory)

### Always Do
1. **Update this CLAUDE.md** at the end of every session that modifies the project. Update the "Current State" section.
2. **Use `api.js`** for all new frontend API calls. Never use `fetch()` directly in page components.
3. **Use `get_db()` correctly** — the `db` from `Depends(get_db)` is already an open connection. Do NOT wrap it in `async with db:`.
4. **Run the backend tests** after any backend change: `python -c "from fastapi.testclient import TestClient; from main import app; ..."`
5. **Keep agent names deterministic** — `agent_seed.py` must match `agentData.js` RNG exactly.
6. **Protect `.env`** — never print, log, or commit secrets.

### Never Do
1. Never rename the `unimind-react/` git root folder.
2. Never hardcode `SUDEEP` or any username — always read from auth state.
3. Never import `fetch` or make API calls outside of `src/lib/api.js`.
4. Never use `async with db:` in route handlers (double-context bug).
5. Never store the Azure API key in frontend code.
6. Never break the xorshift32 RNG parity between Python and JavaScript.

### Adding a New Page
1. Create `frontend-react/src/pages/NewPage.jsx`
2. Add the page key to `App.jsx` state comment and `AnimatePresence` block
3. Pass `onNavigate` props from App
4. Add any API calls to `api.js` first

### Adding a New API Endpoint
1. Add the route to the appropriate router in `backend-python/routers/`
2. Add the Pydantic model to `backend-python/models/` if needed
3. Add the corresponding function to `frontend-react/src/lib/api.js`
4. Update `docs/api-reference.md`

### Design Language
- Background: `#02030A` (near-black)
- Primary gradient: `#00D1FF` (cyan) → `#7B61FF` (purple) → `#FF5FB6` (pink)
- Glass cards: `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px)`
- Text muted: `rgba(255,255,255,0.35)`
- All animations via Framer Motion. Match existing easing: `[0.22, 1, 0.36, 1]`
- No new CSS classes — use Tailwind utilities and inline styles consistent with existing pages

---

## Session Log

### 2026-05-17 — Initial Full-Stack Build
**Changes made:**
- Reorganized project: `src/`, `index.html`, config files → `frontend-react/`; created `backend-python/`; moved `*.md` files → `docs/`
- Built complete FastAPI backend with 16 endpoints across 8 routers
- Implemented SQLite schema (6 tables) with `aiosqlite`
- Ported `xorshift32` RNG from JS to Python (`agent_seed.py`); validated name/score parity
- Seeded database with 10 community posts matching frontend `INITIAL_POSTS` exactly
- Wired Azure OpenAI (`gpt-5-chat`) for chatbot + life simulation
- Added `LoginPage.jsx`, `SignupPage.jsx`, `ChatbotPage.jsx`
- Updated `App.jsx`: added auth state, session persistence, 3 new page states
- Updated `CommunityPage.jsx`: posts and reactions now backed by API
- Updated `OnboardingPage.jsx`: passes `answers` to `onEnter(answers)`
- Created `src/lib/api.js` as single API boundary
- Created `docs/api-reference.md`, `docs/architecture.md`, `docs/setup.md`
- Fixed `bcrypt==4.0.1` compatibility issue with `passlib 1.7.4`
- Fixed `async with db:` double-context bug in all routers
- All backend tests passing (health, signup, login, getMe, onboarding, posts, leaderboard, agent search, network growth, achievements)

### 2026-05-17 — Full Verification Pass
**Verification performed:**
- All 13 backend API endpoints tested via ASGI test client: all return 200
- Agent seed validated: 1,401 agents, ARIA=9842 NOX=9120 VEDA=8633 (matches frontend exactly)
- Database confirmed: tables created, 11 posts seeded (10 seed + reactions), auth working
- Frontend build: `npm run build` → 342 modules, 0 errors, 0 type errors
- Auth flow E2E: login → signup → chatbot → onboarding → agentic → community all wired

**Bugs fixed:**
- Removed hardcoded `userName = 'SUDEEP'` default prop in `AgenticWebPage.jsx` and `CommunityPage.jsx` (CLAUDE.md rule: never hardcode username)

**Remaining known gaps (by design, not bugs):**
- Live activity feed is client-side only (no WebSocket)
- Real user agents not injected into 3D network (still procedural seed data)
- 3D timeline simulation studio not built

### 2026-05-17 — Chatbot, Timeline & Onboarding Upgrade
**Changes made:**
- **ChatbotPage.jsx** — Fixed React 18 strict-mode double-init bug (duplicate opening message) with `useRef` guard. Added suggestion chip quick-replies (4 per stage, advance every 2 AI messages). Gamified with XP system (+50 XP per chunk), level labels (Novice/Emerging/Expert), milestone toast notifications at 3/7/12 chunks. "Mission: Build Your Agent" badge in top bar.
- **chatbot_service.py** — Reduced required exchanges from 12-15 to 6-8. Updated system prompt to be faster and sharper. Updated opening message copy.
- **chatbot_router.py** — Made opening message idempotent: double-checked DB before saving to prevent concurrent duplicate writes.
- **azure_openai.py** — `simulate_life()` now requests structured JSON output: 3 life paths (title, icon, probability, tagline, 3 milestones, agent_match) + collective_insight.
- **simulate_router.py** — Parses LLM JSON output; falls back to a hardcoded 3-path template if LLM returns malformed output.
- **TimelinePage.jsx** (NEW) — Full-screen page showing 3 life paths as collapsible cards with probability bars, vertical milestone timelines, network match labels, and re-run/return actions. Shows animated loading states during fetch.
- **AgenticWebPage.jsx** — Wired `onTimeline` prop to "Continue to Your Timeline →" button in `PortalNext`.
- **App.jsx** — Added `timeline` page state + `simulationData` state. Imports `TimelinePage`. Passes `onNavigateTimeline` to `AgenticWebPage`.
- **OnboardingPage.jsx** — Converted from static 3-question form to chat-style conversational UI. Q2 is now adaptive based on Q1 answer (Student/Founder/Career Switch/Exploring each get a tailored Q2). Chat history shows previous Q&A as bubbles. Removed `glass-card` static boxes, replaced with `AiQuestion`/`UserAnswer` bubbles + inline answer panel.

**Frontend build:** 343 modules, 0 errors — `npm run build` passes.
**Backend syntax:** All modified Python files parse cleanly.

### 2026-05-18 — Simulation Fix + TimelinePage Upgrade
**Problem solved:** Simulation results were not showing because (1) the backend API was only called after navigating to TimelinePage (not during the visual animation), (2) `max_tokens=600` truncated the LLM JSON causing silent fallback, (3) knowledge chunks weren't included in the simulation prompt.

**Changes made:**
- **azure_openai.py** — `max_tokens` raised from 600 → 1500. Added `max_tokens` param to `chat_complete()`. Rewrote system prompt with explicit JSON skeleton (no markdown fences). Improved `simulate_life()` to include `user_profile.knowledge` in the prompt.
- **simulate_router.py** — Now queries up to 15 `knowledge_chunks` for the user and passes them to the LLM for personalised predictions. Returns `knowledge_count` in the response. Better JSON fence stripping + structure validation before falling back.
- **AgenticWebPage.jsx** — On core click, fires `runSimulate()` concurrently with the ~5s visual animation. Stores result in `simData` + `simKnowledgeCount`. Passes both to `onNavigateTimeline(simData, simKnowledgeCount)` when "Continue →" is clicked.
- **App.jsx** — Added `simulationKnowledgeCount` state. Added `chatbotCompleteTarget` state so navigating to chatbot from timeline returns to `agentic` (not onboarding). `onNavigateTimeline(data, kCount)` now stores both. Passes `knowledgeCount` and `onChatbot` to `TimelinePage`.
- **TimelinePage.jsx** — Full redesign: (1) "Enrich Agent" button in top bar navigates to chatbot and returns to agentic when done. (2) `ContextQualityBanner` shows signal quality bar (Minimal/Basic/Moderate/Strong/Deep Signal) based on knowledge count. (3) `ChatbotCTA` section below paths explains context→accuracy relationship. (4) Improved path cards with glowing borders, animated icon, animated chevron, better milestone styling. (5) Stores `knowledge_count` from API response.

**Frontend build:** 344 modules, 0 errors.
**Backend syntax:** Clean.

### 2026-05-18 — CommunityPage Next-Level Upgrade + Dynamic App Data

**Problem solved:** CommunityPage had hardcoded profile stats, hardcoded badge data, no trending/discovery features, and basic post cards. The entire right sidebar and profile were static.

**Backend changes:**
- **models/post.py** — Added `TrendingTagOut(tag, count)` Pydantic model.
- **models/user.py** — Added `posts_count: int = 0` field to `UserProfile`.
- **routers/users_router.py** — `get_me` now accepts `db=Depends(get_db)` and runs a COUNT query on `posts WHERE user_id=?` to return real `posts_count`. Does NOT use `async with db:`.
- **routers/posts_router.py** — Added `GET /api/posts/trending` route (inserted before `POST /api/posts` to avoid route conflict). SQL: `GROUP BY tag ORDER BY count DESC LIMIT 6`. No auth required.

**Frontend changes:**
- **api.js** — Added `getTrendingTags()` export for `GET /api/posts/trending`.
- **CommunityPage.jsx** — Full rewrite. New components:
  - `AnimatedNumber` — springs from 0 to real value using `useMotionValue` + `useSpring`.
  - `ProfileCard` — now fetches `getMe()` + `getAchievements()` in parallel on mount. Shows real score, real posts_count, real earned badges. Rotating gradient ring avatar. Loading skeleton while fetching.
  - `FeaturedStoriesBar` — horizontal infinite-scroll row of top 12 agents from leaderboard (duplicated list + `useAnimationControls` loop). Gradient fade masks on edges.
  - `SortSelector` — replaces tabs with Hot/New/Top/Rising. Animated sliding pill via Framer Motion `layoutId="sort-pill"`.
  - `PostCard` — gradient left glow border on hover, HOT 🔥 badge (>300 reactions), trending ✦ sparkle (>150), expand/collapse for long posts (>200 chars), reaction burst animation (scale 1.35 + brightness flash), gradient avatar circles, reply count.
  - `PostComposer` — 280-char counter (red when <30 left), 9 tags, Broadcast button glow-pulse animation.
  - `TrendingSection` — fetches `getTrendingTags()`, animated bar chart per tag. Falls back to static data.
  - `SuggestedConnections` — fetches `getLeaderboard()`, shows top 4 agents with Connect button.
  - `RightSidebar` — scrollable wrapper for LiveFeed + TrendingSection + SuggestedConnections.
  - `LiveFeed` — enhanced with `getEventMeta()` that maps event text to icon + color (◎/⚡/🧬/📡/🌐).
  - Sort logic (`sortedPosts` useMemo): Hot=by total reactions, New=API order, Top=by score, Rising=recent posts (s/m ago) by reactions.
  - Post stagger: `motion.div` container with `staggerChildren: 0.06` wraps `AnimatePresence`.

**Frontend build:** 344 modules, 0 errors.

### 2026-05-19 — ChatbotPage Major Upgrade (File Upload + Content Enhancer + History Management)

**Changes made:**

**Backend:**
- **requirements.txt** — Added `pypdf==4.3.1`, `python-docx==1.1.2`, `pillow==10.4.0`. All already present in Anaconda env.
- **models/chat.py** — Added `id: Optional[str]` to `ChatMessageOut`; added `EnhanceRequest`, `EnhanceResponse`, `UploadResponse` Pydantic models.
- **routers/chatbot_router.py** — `_save_message()` now returns `(msg_id, created_at)` tuple. All `ChatMessageOut` responses include `id`. Added 4 new endpoints:
  - `DELETE /api/chatbot/history` — clears all chat messages for user, re-seeds opening message
  - `DELETE /api/chatbot/history/{message_id}` — deletes a specific message (validates ownership)
  - `POST /api/chatbot/enhance` — calls `enhance_content()` with user context, returns expanded text
  - `POST /api/chatbot/upload` — accepts PDF/DOCX/TXT/image, calls `extract_text_from_file()`, returns extracted text
- **services/chatbot_service.py** — Added `enhance_content(brief, user_name, chunks)`: expands a short user message into a rich 2–4 sentence first-person statement using LLM + the user's existing knowledge context. Added `extract_text_from_file(data, content_type, filename)`: handles PDF (via `pypdf`), DOCX (via `python-docx`), plain text (UTF-8 decode), and images (via Azure OpenAI vision / base64).

**Frontend:**
- **api.js** — Added: `clearChatHistory()`, `deleteChatMessage(id)`, `enhanceContent(content)`, `uploadFile(file)` (multipart, no Content-Type override).
- **ChatbotPage.jsx** — Full redesign:
  - **File upload**: paperclip button opens hidden `<input type="file">` (PDF/DOCX/TXT/PNG/JPEG/WEBP/GIF). Extracted text stored as `pendingFile`, shown as chip above input. On send, prepended to message. Spinner during upload.
  - **Content Enhancer**: ✦ button calls `/enhance`, shows `EnhancePanel` with original brief vs. AI-expanded version. User edits inline, then "Send Enhanced" or "Send Original".
  - **Per-message delete**: hover any bubble to reveal red × button. Calls `DELETE /api/chatbot/history/{id}`.
  - **Clear all history**: button in ProfilePanel footer with confirmation step.
  - **Message IDs**: all messages carry `id` from backend for delete operations.

### 2026-06-01 — Developer Control Plane (Full Backend + UI)

**What was built:**
A complete internal developer control plane at `/developer` — separate from the user-facing app, gated by its own auth, backed by real database telemetry.

**New pages:**
- **DeveloperLoginPage.jsx** — Terminal boot sequence UI. Calls `POST /api/dev/auth`, stores returned JWT in `localStorage` as `unimind_dev_token`. Accessible at `http://localhost:5173/developer`.
- **DeveloperPage.jsx** — 6-tab control plane. All tabs call real backend endpoints, no mock data:
  - **LLM Health** — tokens today, estimated Azure cost, fallback rate, avg latency, per-call log. Auto-warning if fallback rate > 15%.
  - **Onboarding Funnel** — signed up → chatbot complete → ran simulation → posted. Drop-off at each step, recent signup positions.
  - **User List** — every user with chunk count, sim count, last active, agent quality label. Inline Clear (wipes knowledge + chat) and Suspend/Restore actions.
  - **Simulation Monitor** — fallback rate front and centre, per-simulation log showing chunks used and output type (LLM vs fallback).
  - **Controls** — 4 live feature flag toggles (simulations/community/chatbot/enhance), clear user data, delete post, broadcast system message to community feed.
  - **Community Health** — posts/reactions per day charts, zero-engagement count, top posts by reactions.

**Backend — new DB tables** (auto-created + migrated on startup):
- `llm_logs` — every Azure OpenAI call: user, type, tokens in/out, latency ms, status
- `simulation_logs` — every simulation: user, chunks used, duration, output type (llm/fallback)
- `feature_flags` — 4 flags seeded to enabled=1 on first boot
- `broadcast_messages` — archive of broadcasts sent
- `users.suspended` + `users.last_active` — added via safe ALTER TABLE migration

**Backend — instrumentation:**
- `azure_openai.py` — `chat_complete()` now accepts `return_usage=True`, returns `{content, tokens_in, tokens_out, duration_ms}`
- `simulate_life()` returns `(content, usage_dict)` tuple
- `chatbot_router.py` — logs every LLM call to `llm_logs`, updates `users.last_active`
- `simulate_router.py` — logs to both `llm_logs` + `simulation_logs`, updates `users.last_active`

**Backend — dev auth** (`auth.py`):
- `create_dev_token(email)` — 12h JWT with `role: "developer"` claim
- `validate_dev_credentials(email, password)` — checks `DEV_CREDENTIALS` list (env-overridable)
- `get_dev_user` dependency — validates dev JWT, rejects regular user tokens

**Backend — new router** (`routers/dev_router.py`, prefix `/api/dev`):
16 endpoints: `/auth`, `/llm/stats`, `/llm/recent`, `/llm/hourly`, `/funnel`, `/users`, `/users/{id}/clear`, `/users/{id}/suspend`, `/posts/{id}` (DELETE), `/broadcast`, `/flags` (GET+POST), `/simulations/stats`, `/simulations/recent`, `/simulations/daily`, `/community/stats`

**Frontend — api.js:**
Added `devLogin()` + 15 `getDevXxx/clearDevXxx/updateDevXxx` functions using a separate `devRequest()` helper that reads `unimind_dev_token`.

**App.jsx routing:**
- Detects `window.location.pathname === '/developer'` on mount
- If true → starts at `developer-login` state → on success → `developer` state
- Otherwise → starts at `onboarding` as before (user auth flow unchanged)
- `AgenticWebPage` has a "Developer ⬡" button in TopBar that also navigates to developer page

**Developer credentials:**
```
admin@unimind.dev  /  unimind-dev-2025
team@unimind.dev   /  unimind-dev-2025
```
Override via `DEV_EMAIL_1`, `DEV_EMAIL_2`, `DEV_PASS` env vars.

**Known gaps (documented in `docs/erd.md`):**
- `suspended` flag exists in DB but no route handler checks it yet — suspended users can still call all endpoints
- `llm_logs` has no index on `created_at` and no cleanup policy — will grow indefinitely
- `last_active` only updates on chatbot + simulation calls, not page visits or community posts
- `agent_skills` is stored as a JSON string in `users` table, not a queryable junction table
- No indexes on any table — full table scans on every query

**Docs added:**
- `docs/erd.md` — full entity relationship diagram with known design issues
- `docs/session-brief-2026-05-31.md` — detailed session brief of all changes

**Dead files (unused, safe to delete):**
- `frontend-react/src/pages/DeveloperSignUpPage.jsx`
- `frontend-react/src/pages/SignInPage.jsx`

**Frontend build:** 0 errors. **Backend syntax:** all files clean.

**Frontend build:** 345 modules, 0 errors — `npm run build` passes.
**No backend changes** — Developer page uses existing `/api/leaderboard` and `/api/network/growth`; all other metrics are mock data designed for future wiring.

### 2026-06-16 — Agent Studio + Community + Simulator Overhaul

**Changes made (frontend only, no backend changes):**

**New file:**
- **`frontend-react/src/data/knowledgeBase.js`** — Local dummy data module. Exports: `PLATFORM_STATS`, `STUDENT_PROFILES` (10 profiles), `COMMUNITY_POSTS` (10 posts with A2A flags and postType), `SIMULATION_SCENARIOS` (4 full scenario objects), `A2A_LOGS` (5 agent-to-agent interaction logs), `AGENT_LEVELS` (BABY/SMALL/MIDDLE/HIGH/MAX config with colors, badges, capabilities, XP thresholds), `getAgentLevel(chunks)`, `getXPFromChunks(chunks)`, `SUGGESTED_CONNECTIONS`. No API calls — all local.

**AgentStudioPage.jsx — Complete rewrite** (was resume-builder pipeline, now knowledge chatbot with level system):
- BABY → SMALL → MIDDLE → HIGH → MAX level system keyed to knowledge chunk count (0 / 1-5 / 6-15 / 16-30 / 31+)
- 5 dynamic SVG agent icons using native `<animate>`/`<animateTransform>`/`<animateMotion>`: `BabyOrb`, `SmallOrb`, `MiddleHumanoid`, `HighAvatar`, `MaxEntity` — each with unique animations and colors matching the level
- `AgentSidebar` (276px): large icon + name + `LevelBadge` + `XPBar` + `ConnectedTools` (7 tools unlocking at chunk thresholds) + `CapabilitiesList` + knowledge counter + level-up teaser
- `AgentMessage` with mini icon, level badge, confidence % per level (MAX=94%, HIGH=78%, MIDDLE=61%)
- Level-up milestone toast at 1/6/16/31 chunks
- File upload (PDF/DOCX/TXT/image), per-message delete, XP tracking, `QuickChips` shortcuts

**CommunityPage.jsx — Full agentic redesign:**
- Posts display as "Agent of [Username]" with rotating gradient avatar ring + `MiniAgentIcon` per level
- `A2ABadge` (pulsing purple) on A2A-protocol posts
- `PostTypeBadge` for question/problem/achievement/resource post types
- `TypeFilter` bar: All / Questions / Problems / Achievements / Resources
- `PostCard`: gradient left-border glow on hover, HOT badge (>300 reactions), expand/collapse long posts, XP reward display, XP float animation on react
- `PostComposer`: post type selector (4 types) + 8 tags + 280-char counter + broadcast animation
- `FeaturedStoriesBar`: infinite-scroll animated row of leaderboard agents with level rings
- `SortSelector`: Hot / New / Top / Rising with animated sliding pill
- `A2AProtocolFeed`: right sidebar showing A2A_LOGS with XP transfer amounts
- `ProfileCard`: fetches real getMe() + getAchievements(), shows level ring, XP bar, animated score
- Sort logic: Hot=total reactions, Top=agent score, Rising=recent posts by reactions
- Real API: getPosts, createPost, reactToPost, getLeaderboard, getAchievements, getTrendingTags

**AgenticWebPage.jsx — Simulator panel added:**
- `SimulatorPanel`: slide-in right panel (420px) with input textarea, 4 quick-scenario buttons, animated 4-step loading sequence ("Searching agentic web…" / "Connecting to agents…" / "Running Graph RAG analysis…" / "Synthesizing insights…"), results with citation bar (basedOn + confidence%), path cards with probability bars + company tags + timing recommendation + similar profiles, "New Simulation" reset
- `SimulatorButton`: floating right-center glowing ⚡ button to open panel (only visible when showUI=true and panel closed)
- Scenarios sourced from `knowledgeBase.SIMULATION_SCENARIOS`, data transformed to panel shape on result
- Panel state: `simPanelOpen` — does not interfere with existing 3D simulation flow (core click → runSimulate)

**App.jsx:**
- Added `AgentStudioPage` lazy import
- `chatbot` bottom-nav tab now renders `AgentStudioPage` instead of `ChatbotPage`
- Bottom nav label for chatbot changed from "Chatbot" to "Agent"
- `ChatbotPage` still imported (unused by nav but available if needed)

**Frontend build:** 2072 modules, 0 errors — `npx vite build --emptyOutDir false` passes. (emptyOutDir=false needed due to Windows/OneDrive filesystem permissions in the Linux sandbox; no impact on the app itself.)

### 2026-06-16 — OnboardingPage Responsive Layout Fix

**Problem solved:** `OnboardingPage.jsx` used a fixed `45fr/55fr` CSS grid with hard-coded inline pixel paddings (80px/40px) and a strict `w-screen h-screen overflow-hidden` wrapper — no responsive breakpoints at all. Below desktop width the chat column was squeezed by the fixed padding, and since the right pane's 3D scene host relies on its parent having an explicit height (it positions children with `absolute inset-0`), naively stacking the columns on small screens would have collapsed it to 0px height.

**Changes made (`frontend-react/src/pages/OnboardingPage.jsx`, no backend changes):**
- Outer page wrapper: `overflow-hidden` → `overflow-y-auto lg:overflow-hidden` so content taller than the viewport (accumulated chat history) can scroll on small screens instead of clipping, while desktop keeps the original no-scroll behavior.
- Main layout container: replaced the inline `style={{ gridTemplateColumns: '45fr 55fr' }}` grid with `flex flex-col` (stacked, mobile-first) that switches to `lg:grid lg:grid-cols-[45fr_55fr]` at the `lg` (1024px) breakpoint.
- Left (chat form) column: inline `paddingLeft:80/paddingRight:40` replaced with responsive Tailwind padding (`px-5 sm:px-8 lg:pl-20 lg:pr-10`); switched from always-vertically-centered to `items-start` on mobile (with top padding to clear the absolute `TopBar`) and `lg:items-center` to match the original desktop look exactly.
- Right (3D scene) pane: given an explicit `h-[46vh] sm:h-[52vh] lg:h-auto` so `SceneHost`'s `absolute inset-0` children render correctly when stacked below the form on mobile; reverts to grid-stretch sizing at `lg:`. `scene.js` already listens for `window resize` and reads `container.clientWidth/clientHeight`, so the Three.js canvas adapts automatically across the breakpoint with no JS changes needed.
- Scaled down typography and spacing at smaller breakpoints: heading (`text-[38px]` → `28/32/38px`), final payoff text, `StageLabel` offsets, question/done card padding, and the bottom `PARTICLES · MOLECULE · DNA · BRAIN / RENDER · LIVE` caption row (added `truncate`/`flex-shrink-0` so it can't overflow narrow screens).
- `TopBar`: responsive padding, hid `/ THE AGENTIC WEB` below `sm` to prevent crowding next to the version/timer text.
- Hid the absolute center divider line below `lg` (`hidden lg:block`) since it has no meaning once the layout is a single column.

**Verification:** `npx vite build --emptyOutDir false` → 2072 modules, 0 errors. Not visually verified in a live resized browser this session (no browser-automation tool available) — recommend checking `localhost:5173` at mobile/tablet/desktop widths to confirm.

**Follow-up fix (same day):** The first pass kept `lg:items-center` (vertical centering) on the left chat column at desktop width while leaving the outer wrapper `lg:overflow-hidden`. Once the onboarding chat history grows long enough (3 Q&A pairs + the final "done" card with its buttons), the centered content became taller than the viewport — centering pushed the top half behind/above the `TopBar` and the bottom half (including the "Enter UniFund →" button) below the fold, with no way to scroll to it since scrolling was disabled at `lg:`. Root cause: centering unbounded/growing content is unsafe — it overflows equally in both directions instead of just one.
- Fix: left column is now always `items-start` (no more `lg:items-center`), keeps `pt-24 sm:pt-28` top clearance at all breakpoints (removed the `lg:pt-0` override), and gained `lg:overflow-y-auto` so it scrolls **internally** once its content (chat history) exceeds the 100vh row height granted by CSS grid stretch — independent of the right-hand 3D scene pane, which stays fully visible. `TopBar` is a sibling outside this scroll container, so it now stays fixed in place rather than ever being overlapped or scrolled away.
- Verified with another clean `npx vite build --emptyOutDir false`.

### 2026-06-16 — Multi-Agent Pipeline, A2A Live Counter, Demo Simulator + Build Repairs

**Changes made (frontend only, no backend changes):**

**Improvement 1 — Agent Thinking Pipeline (`AgentStudioPage.jsx`):**
- Added `getPipelineStages(query)` — returns 4-5 stage arrays based on keyword detection (job/resume → resume pipeline, finance → finance pipeline, skill/goal → skill pipeline, default → generic reasoning pipeline).
- Added `AgentThinkingPipeline` component: vertical list of sequentially activating stage nodes (each ~700ms apart via staggered `setTimeout`). Active node shows pulsing colored ring + emoji + label; completed nodes show ✓ checkmark; future nodes are dimmed. Replaces the old spinner.
- Updated `AgentMessage` to accept `thinkingQuery` and `isNew` props. `thinkingQuery` passes the user's last message into `AgentThinkingPipeline` for keyword routing. `isNew` triggers a typewriter effect (9ms/char) via `setInterval` in `useEffect`.
- Updated `sendMessage` to tag loading messages with `thinkingQuery: text` and resolved messages with `isNew: true`.

**Improvement 2 — A2A Live Counter + Marquee (`CommunityPage.jsx`):**
- Added `A2A_MARQUEE_ITEMS` array of 10 agent interaction strings for the ticker.
- Rewrote `A2AProtocolFeed` component:
  - Live counter starting at a random value (40–65) and ticking up by 1–3 every 8–15 seconds via self-scheduling `setTimeout` (avoids stale closure). Counter `motion.span` with `key={counter}` animates scale pop (1 → 1.28 → 1) on each tick.
  - Green pulsing `animate-ping` dot + "🌐 1,523 agents online" static label.
  - Horizontal marquee: `motion.div` with `animate={{ x: [0, -2400] }}`, `duration: 32`, `ease: 'linear'`, `repeat: Infinity`, showing 10 A2A strings with `·` separators.

**Improvement 3 — Demo Query + Rich Results (`AgenticWebPage.jsx`):**
- Added `DEMO_QUERY` constant (Ireland AI/ML internship query text).
- Added `DEMO_RESULT` object with `isDemoResult: true`, `basedOn`, `confidence`, `paths` (2), `companyCards` (6 companies with hiring counts, response rates, skill pills, animated bars), `topSkills` (6 ranked skills with % + color), `similarProfiles` (3 student profiles with uni + match %), `agentInsight` (gold insight box).
- Added "🎯 Try Demo Query" button in SimulatorPanel input area with pulsing gold `animate` on the border. Clicking fills the textarea with `DEMO_QUERY` and schedules `handleRunWithInput(DEMO_QUERY, true)` after 500ms.
- Refactored `handleRun()` → split into `handleRun()` + `handleRunWithInput(queryText, isDemo)`. `isDemo=true` path skips the API and directly uses `DEMO_RESULT` (still plays the full 4-step loading animation).
- Added rich result rendering sections: company cards with animated hiring bars + skill pills, top skills ranked list with colored bars, enhanced similar profiles showing university + match %, gold agent insight box.

**Build repairs (this session):**
- `OnboardingPage.jsx` — restored from git HEAD (was truncated at line 544, missing lines 545–555). Now 555 lines.
- `CommunityPage.jsx` — was truncated at line 992 (mid return statement). Appended missing JSX: top-bar interior, 3-column layout (ProfileCard + center feed with TypeFilter + RightSidebar), achievement toast. Final: 1068 lines.
- `AgentStudioPage.jsx` — was truncated at line 905 mid-`init()` function. Appended: remainder of `init()`, `sendMessage`, `handleSend`, `handleKeyDown`, `handleDelete`, `handleFileUpload`, full return JSX (sidebar toggle, chat area, input bar with file upload, level-up milestone toast). Stripped trailing null byte. Final: 1142 lines.

### 2026-06-16 — OnboardingPage Responsive Fix, Take 2 (scrollbar + commit)

**What happened:** The "Build repairs" pass above (restoring `OnboardingPage.jsx` from git HEAD because it looked truncated) silently wiped the responsive-layout fix from earlier today, since that fix had never been committed. From the outside this looked like "the fix didn't work" — it had actually been reverted to the pre-fix file by an unrelated repair step running in another session over the same working tree.

**Re-applied the same responsive fix** (see the "OnboardingPage Responsive Layout Fix" + its "Follow-up fix" entry above — identical changes, redone after the revert), **plus one addition**:
- `frontend-react/src/index.css` — added a scoped `.form-scroll` class (`scrollbar-width: thin` + styled `::-webkit-scrollbar-thumb` with the app's cyan→purple gradient) so the left chat column has a visible scrollbar. The app has a global `::-webkit-scrollbar { width: 0; height: 0; }` rule that hides scrollbars everywhere by design; `.form-scroll` is a higher-specificity opt-out applied only to the onboarding chat column, so the rest of the app is unaffected.
- Applied `.form-scroll` to the left column div alongside `lg:overflow-y-auto`.

**Committed this time** (commit `5a65622`, staging only `OnboardingPage.jsx` + `index.css`) specifically so a repeat "build repair" pass elsewhere in the repo can't silently revert it again — `git status` showed `AgentStudioPage.jsx`, `CommunityPage.jsx`, `AgenticWebPage.jsx`, `App.jsx`, and `package.json` all still uncommitted from that other concurrent session at the time. **If you're running multiple Claude Code sessions against this repo at once, be aware they can clobber each other's uncommitted work this way** — commit or stash before starting a second session on overlapping files.

**Verification:** `npx vite build --emptyOutDir false` passes, 0 errors.

**Frontend build:** 13 chunks, 0 errors — `npx vite build --emptyOutDir false` passes.

### 2026-06-16 — Agent Studio: interactive MCP tools drive the level + A2A resume pipeline + Sudeep MAX profile

**Why:** The `AgentStudioPage` (what the bottom-nav "Agent" tab renders) was missing the left-screen "agents communicating" view that the old `ChatbotPage` had, its Connected Tools were read-only (level was driven only by chat chunks), and Sudeep's profile wasn't pre-filled. This session fixes all three so the demo script works: connect/disconnect tools to raise/lower the level (all = MAX), paste a job post → watch agents collaborate (A2A) → download a tailored resume.

**Changes (frontend only, no backend changes):**

**`frontend-react/src/data/knowledgeBase.js`** — appended shared, reusable demo data (imported by AgentStudioPage; not duplicated):
- `SUDEEP_PROFILE` — his REAL profile pulled from the `resume-tailor` skill master profile (MSc AI @ NCI, Vially intern, Soliton $1M TI contract, IEEE Best Paper 2025, full skills/experience/projects/education/certs/awards/goals/routines/hobbies).
- `MCP_TOOLS` — 8 connectable sources (LinkedIn, GitHub, Resume, IEEE/Scholar, Portfolio, Azure/Cloud, YouTube, X) each with a `chunks` weight (sum = 39). `chunksFromTools(ids)` + `MCP_TOTAL_CHUNKS`. Connected-tool chunks feed `getAgentLevel()` → all connected = MAX (39 ≥ 31).
- `STUDIO_AGENTS` (12) + `RESUME_PIPELINE_AGENTS` (ARIA→SCOUT→NEXUS→LENS→RESUME) + `buildResumeAgentLogs()` (A2A comm timeline).
- `analyzeJobDescription(jd)` (local JD parse: role/company/skills), `buildTailoredResume(jd)` (returns backend-compatible `{jd_analysis, match_analysis, resume, agent_logs, user_name}` from Sudeep's real data — no backend/LLM needed, deterministic for demos), `resumeToText()` + `resumeToDocHtml()` (Word-openable `.doc` export).

**`frontend-react/src/pages/AgentStudioPage.jsx`** — full rewrite around a 2-column layout:
- Left "brain" panel: persistent level header (icon + level + XP) + 4 tabs — **Agent** (bio, goals, routines, hobbies, skills, experience, awards from SUDEEP_PROFILE), **Tools** (interactive connect/disconnect toggles + Connect-all/Disconnect-all; live level recompute + up/down toast), **Network** (A2A agent list + live comms, auto-opens during the resume pipeline), **Knowledge** (per-connected-tool imported chunks).
- Level is now `getAgentLevel(chunksFromTools(connectedTools) + chatChunks)`. Default `connectedTools = ALL` → Sudeep boots at MAX; disconnecting tools lowers the level in real time.
- Resume pipeline: paste a job post (resume-mode toggle `📄`, file upload, or auto-detected JD/`resume` intent) → pushes the JD, switches to the Network tab, replays A2A agent logs (agents "borrowing skills" from each other), then renders a `ResumeCard` with **Download Resume (.doc)** + Copy. Tailored locally from Sudeep's real profile.
- Chat still uses `sendChatMessage` with a graceful offline fallback; multi-agent thinking pipeline retained.

**Verification:** The OneDrive→Linux sandbox mount was a frozen snapshot this session (it never received the file-tool writes; it also held a pre-existing truncated `OnboardingPage.jsx`), so a full `vite build` on the mount was not representative. Instead, the real file contents were reconstructed via the live `outputs` bridge and syntax-checked with esbuild: **AgentStudioPage.jsx → AST_SYNTAX_OK**, **knowledgeBase.js additions → KB_REAL_OK**. Authoritative `Read` confirmed both files complete and well-formed. Recommend a local `npx vite build` to confirm end-to-end.

> Note for future sessions: the Linux mount under `/sessions/.../mnt/UniMind` can lag/freeze behind file-tool writes (OneDrive sync). Trust the `Read` tool as authoritative; the agent `outputs` dir is a live bridge usable for esbuild syntax checks.

### 2026-06-16 — Agent Studio: right-sidebar Voxel character + live Agent Arena

**Why:** All "agents collaborating" visualization was buried in a `Network` *tab* inside the left sidebar, and only the resume pipeline ever populated it — ordinary chat questions got no agent-communication visualization at all (just one inline icon list in the chat bubble). User wanted a persistent RIGHT-side panel with (1) a game-character-style avatar for their own agent that visibly upgrades/downgrades with level, and (2) a live "gathering circle" of multiple agent characters animating/communicating for **every** question asked, not just resume requests — referencing two mockup images (a blocky pixel-art RPG character, and a third-party flow-diagram with pending/active/done node states).

**Changes (frontend only, `frontend-react/src/pages/AgentStudioPage.jsx`, no backend changes):**
- **`VoxelCharacter`** (new) — a blocky/geometric humanoid (stacked rounded-rect div "blocks": head/torso/arms/legs/chest-core), config-driven per `AGENT_LEVELS` (`VOXEL_LEVEL_CONFIG`): BABY dull/dormant → SMALL small lit core → MIDDLE pulsing core + shoulder pads → HIGH glowing core + cape + 2 orbiting particles → MAX full gold aura + crown + 3 orbiting particles. Idle breathing motion + randomized blink; a `key={level}` burst-ring transition replays automatically on level change (same pattern as the existing `LevelHeader`).
- **`CharacterCard`** (new) — right-sidebar header card: `VoxelCharacter` (164px) + existing `LevelBadge` + existing `AGENT_LEVELS[level].description` (reused, not duplicated) + knowledge-chunk count.
- **`AgentToken` / `AgentConnectorLine` / `AgentArenaPanel`** (new) — a "gathering circle": center hub = compact `VoxelCharacter`; the 12 `STUDIO_AGENTS` arranged in two concentric rings (inner 5 = `RESUME_PIPELINE_AGENTS`, outer 7 = the rest) via the `rotate(angle) translateX(radius)` polar-positioning technique already used elsewhere in this codebase (`SignInPage.jsx`, `ChatbotPage.jsx`), with inner content counter-rotated so icons stay upright. Idle = dim + slow per-token bob; `active` = bright + scaled + glowing pulsing ring + an animated traveling dot along the connector line to center; `done` = green check, settling dim. A compact 2-line live ticker (reusing the existing `CommLog` row styling) shows the latest agent-to-agent messages.
- **`getPipelineStages`** rewritten: previously returned ad hoc `{icon,label,color}` per stage unrelated to the real agent roster; now returns `{agent, status}` referencing real `STUDIO_AGENTS` ids via a new `PIPELINE_AGENT_ROUTES` map (job/finance/skill/default routes, each bookending on `ARIA` as orchestrator — matching how `buildResumeAgentLogs` already always starts/ends on ARIA). `AgentThinkingPipeline` now accepts an optional `stages` prop (falls back to computing its own) and resolves icon/color by looking up `STUDIO_AGENTS`, so the in-chat-bubble pipeline and the new right-side Arena always show identical agent identities.
- **`runArenaForStages(stages)`** (new helper) — the actual fix for "only the resume pipeline gets visualized": walks any `{agent,status}` stage list on the existing `STAGE_TIMINGS` schedule, writing into the *same* `statuses`/`logs` state the resume pipeline already drives. `sendMessage` now calls this for every ordinary chat question, so the new Arena lights up for **all** questions, not just resume requests. `runResumePipeline` itself is untouched (its own richer 9-entry `agent_logs` already drives `statuses`/`logs` directly).
- Right sidebar container: new `rightSidebarOpen` state (mirrors the left `sidebarOpen`), a `▥` toggle button next to the existing `☰` in the top bar, fixed 320px column (`CharacterCard` + `AgentArenaPanel`) mirroring the left sidebar's styling — desktop-first, no responsive breakpoints added (matches the rest of this already-non-responsive page). `arenaActive = running || isLoading` is derived, not new raw state (kept separate from the resume-pipeline-specific `running` lock so ordinary chat doesn't accidentally disable the input bar).
- Bug caught during browser verification and fixed: wrapping the new Arena's live-log ticker in `<AnimatePresence>` threw a React "Function components cannot be given refs" warning, because the shared `CommLog` component (used elsewhere as a plain unanimated list in `NetworkPanel`) isn't a `forwardRef` component. Fixed by dropping the `AnimatePresence` wrapper around the ticker rather than changing the shared `CommLog`.

**Verification:** `npx vite build --emptyOutDir false` → 2072 modules, 0 errors. Additionally launched the actual dev server and drove it end-to-end with a throwaway local Playwright script (through onboarding → Agentic Web → the bottom-nav "Agent" tab) — confirmed by screenshot: the MAX-level gold character renders with crown/aura/particles in the right sidebar; sending a plain chat message lights up ring tokens and the live ticker with correct agent-to-agent text (e.g. `SCOUT → NEXUS: Cross-referencing context…`); disconnecting all tools in the Tools tab correctly drops the character to the SMALL/blue look in real time. No regressions found via `console --errors` other than the `CommLog` ref warning above (now fixed) and expected CORS/401 noise from no backend running.

### 2026-06-16 — Agent Studio follow-up: remove left/right duplication, humanize the character, fix message text + bottom-nav centering

**Why:** Direct user feedback on the feature above, screenshot-driven: (1) the left sidebar's `Network` tab and the new right-side `AgentArenaPanel` showed the literal same ARIA/SCOUT/NEXUS/LENS/RESUME roster + comms log — redundant now that the right side covers it; (2) `VoxelCharacter` read as a robot (boxy visor-head, no human features) rather than the "human persona" the user wanted; (3) pasted/scraped text (e.g. job-board snippets with runs of blank lines: `Apply\n\nSave\n\nShow more options…`) rendered with huge ragged vertical gaps in chat bubbles; (4) the bottom nav pill (Runway/Web/Agent/Community) was visibly off-center.

**Changes:**
- **Removed the left-sidebar `Network` tab entirely** (`frontend-react/src/pages/AgentStudioPage.jsx`): deleted `AgentRow` and `NetworkPanel` (kept `CommLog` — still used by the right-side Arena ticker), removed `'network'` from the `TABS` array and the now-unused `networkBadge` prop/pulse-dot on `TabStrip`, removed the `activeTab === 'network'` render branch. `runResumePipeline` now calls `setRightSidebarOpen(true)` instead of force-switching the left tab to `'network'` + forcing the left sidebar open — the live pipeline visualization is now exclusively the right-side Agent Arena. Updated 4 copy strings that referenced "the Network tab" to reference "the Agent Arena" instead.
- **Humanized `VoxelCharacter`**: was a blocky robot (square visor-bar head, no neck, armor-plate torso). Now: constant skin-tone gradient head (`VOXEL_SKIN`/`VOXEL_SKIN_SHADE`, not level-colored) with a rounded human head shape, a dark hair cap (`VOXEL_HAIR`, constant across levels so the character keeps one consistent identity as it levels up), two round glowing eyes (replacing the visor bar) with the existing blink animation, a small mouth line, and a neck connecting head to torso. The torso is now a suit jacket (`cfg.primary/secondary`) with a white shirt collar (CSS `clipPath` triangle), a tie colored by the new `cfg.tie` field, and the old centered "chest reactor" reframed as a small glowing tie-pin (`cfg.core`). Renamed the old `head` config field to `accent`, now used for shoulder/epaulette color so MIDDLE+ levels get a visible blazer-structure accent. Crown (MAX) is now anchored at the hairline instead of floating above empty space. Net effect: still one figure that visibly escalates BABY→MAX exactly as before, but reads as a person in a suit (matching the user's reference image) rather than a toy robot.
- **Chat message text formatting**: added `formatMessageText()` (collapses 3+ consecutive newlines to a single blank line, trims trailing whitespace per line) applied to both `UserMessage` and `AgentMessage` bubble content — fixes the sprawling-vertical-gap look when a user pastes scraped web text (job board UI chrome, etc.) without touching the `pre-wrap` rendering for legitimately-formatted multi-paragraph responses.
- **Fixed bottom-nav centering** (`frontend-react/src/App.jsx`, `BottomNav`) — root cause confirmed via Playwright bounding-box measurement (nav's left edge sat exactly at viewport-center instead of being centered on it, a ~203px rightward visual offset on a 1440px-wide page): `motion.div` had both a static `style.transform: 'translateX(-50%)'` *and* Framer-Motion-driven `animate={{ y: ... }}` — Framer Motion owns and overwrites the whole `transform` property once any animated transform value is present, silently dropping the static centering. Fixed by moving the centering into Framer Motion's own props (`initial`/`animate` now include `x: '-50%'`) instead of a competing static `style.transform`. This was a pre-existing bug affecting every page with the bottom nav, not specific to Agent Studio — just more noticeable once the new symmetric two-sidebar layout made the surrounding asymmetry obvious.

**Verification:** `npx vite build --emptyOutDir false` → 2072 modules, 0 errors. Re-verified live via Playwright: measured nav bounding box gives exactly `0px` offset from true viewport center (both on the Web page and on Agent Studio); evaluated the left `TabStrip` button labels and got exactly `["Agent","Tools","Knowledge"]` (Network gone); screenshotted the humanized character at MAX (gold suit, tie, hair, crown gem) and confirmed via `console --errors` there are no React warnings; sent a deliberately messy multi-blank-line message and confirmed the rendered bubble no longer has sprawling gaps between fragments.

### 2026-06-16 — Agent Arena replaced with a living Space Arena simulation

**Why:** Direct user feedback (screenshot of the old orbit-ring Agent Arena): wanted it to feel like an actual simulation — small characters walking around and helping each other (referenced Minecraft / Clash of Clans pacing), a visible "my agent gets walked-over-to and helped by other agents" story beat per question asked (not just the resume pipeline), and a fullscreen option. Mid-implementation the user redirected the visual theme from a fantasy "village" to a sci-fi "space arena" — a better fit for this app's existing cyan/purple/pink neon brand than huts/dirt paths would have been.

**New files:**
- **`frontend-react/src/components/VoxelCharacter.jsx`** — extracted the `VoxelCharacter`/`VOXEL_LEVEL_CONFIG` renderer out of `AgentStudioPage.jsx` (previously private to that page) so it can be shared by the new arena. Added two new props: `walking` (swaps idle breathing for a faster bob + alternating leg/arm swing — a real walk-cycle) and `facing` (1/-1, flips the sprite via `scaleX` so it visibly turns to face the direction it's walking).
- **`frontend-react/src/components/SpaceArena.jsx`** (new, exports `SpaceArena` + `ArenaFullscreenOverlay`) — a self-contained simulation, drop-in replacement for the old ring diagram, driven by the *same* `statuses`/`logs` state `AgentStudioPage` already produced (no pipeline/timing logic changed):
  - **Scene:** starfield (mix of static + a handful of CSS `@keyframes star-twinkle`-animated stars, added to `index.css`) + soft cyan/pink/purple nebula glows + a dashed elliptical "deck ring". Each of the 12 `STUDIO_AGENTS` gets a docking `Pod` arranged in an ellipse (`buildStationLayout`, clamped to stay inside the box so nothing clips at the small 288×320 sidebar size), connected to the center by a `TransitLane` (always has a faint traveling light pulse; brightens when that agent is active).
  - **Crew AI:** each agent has its own self-scheduling idle-wander loop (nudges to a nearby spot every ~3-7s) that automatically pauses while it's helping. When `statuses[agentId]` flips to `'active'`, that agent's `CrewSprite` walks (real walk-cycle via `VoxelCharacter walking`) from its pod to a spot partway toward the Command Core, shows a `SpeechBubble` with its latest log message, and on `'done'` fires a `KnowledgePhoton` (a small glowing orb) from itself to the user's own character before walking back to its pod and resuming wander. The user's own agent (any level, via `VoxelCharacter level={coreLevel}`) stands permanently on the glowing `CommandCore` at the center.
  - **Story flow:** a bottom `StoryTicker` shows the most recent `from → to: message` line(s) (1 line compact, 3 in fullscreen), same data the old ticker used.
  - **Fullscreen:** an ⤢ button (top-right of the arena) opens `ArenaFullscreenOverlay` — a `position: fixed` full-viewport scene (same component, larger), Escape-to-close, with its own header/close button.
- **`frontend-react/src/pages/AgentStudioPage.jsx`** — removed the now-dead ring visualization (`AgentToken`, `AgentConnectorLine`, `AgentArenaPanel`, `INNER_RING_AGENTS`/`OUTER_RING_AGENTS`, `CommLog`) and the inline `VoxelCharacter`/`VOXEL_LEVEL_CONFIG` (now imported). Right sidebar renders `<SpaceArena .../>` in place of `<AgentArenaPanel/>`; added `arenaFullscreen` state + `<ArenaFullscreenOverlay/>` rendered via `AnimatePresence` alongside the existing `Toast`.

**Bug caught during browser verification (and fixed):** the fullscreen overlay initially showed two overlapping close buttons — the overlay's own header `✕` *and* the arena panel's internal header `✕` (left over from when `ArenaHeader` always rendered a close button while `fullscreen`). Fixed by making `ArenaHeader` only ever render the expand (⤢) button, never a close button — the overlay's own header + Esc key are the only close affordance now. Removed the now-unused `onClose` prop from `SpaceArena`/`ArenaHeader`.

**Verification:** `npx vite build --emptyOutDir false` → 2074 modules, 0 errors. No `chromium-cli` or local Playwright install in this repo, but a cached Playwright (from a prior `npx playwright` run, browsers already present under `%LOCALAPPDATA%\ms-playwright`) was invoked directly via its absolute cache path in a throwaway Node script — drove the real flow end-to-end: onboarding (Student → Build something technical → Self-doubt, "Bring it to life" → "Enter UniFund →") → bottom-nav "Agent" tab → Agent Studio → typed a chat message → screenshotted mid-animation (confirmed a crew sprite walking in, speech bubble, ticker all rendering correctly at the small 288×320 sidebar size with zero clipping) → clicked ⤢ → screenshotted fullscreen (caught the duplicate-✕ bug here) → Escape → confirmed the overlay actually unmounts. `console --errors` showed only expected backend-offline noise (guest-login CORS/401 — no backend was running) and pre-existing WebGL driver warnings; no React warnings or errors from the new components. Temp verification script/screenshots deleted after use; not committed.
