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

### 2026-05-26 — Docs + CLAUDE.md Full Refresh + RunwayPage Discovery
**Changes made:**
- **RunwayPage.jsx** (discovered) — Developer financial runway tracker. Accessible via "Runway →" from AgenticWebPage. Fully client-side. Tracks income sources, expense categories, monthly history chart, AI insights, dev deals. Runway gauge (SVG semicircle). App.jsx routes `page='runway'`.
- **App.jsx** — Auth confirmed bypassed: app starts at `'onboarding'` directly. Login/signup pages exist but commented out. Lazy loading on all non-auth pages.
- **All docs updated to current state:**
  - `docs/frontend.md` — Full rewrite. New pages section (Login/Signup/Chatbot/Onboarding/AgenticWeb/Timeline/Community/Runway). api.js table. Updated App.jsx routing. Lazy loading pattern. Removed stale "Backend Integration Points" section.
  - `docs/api-reference.md` — Added: GET /posts/trending, DELETE /chatbot/history, DELETE /chatbot/history/{id}, POST /chatbot/enhance, POST /chatbot/upload. Updated GET /users/me (posts_count). Updated POST /simulate (structured JSON response).
  - `docs/architecture.md` — Updated folder tree (RunwayPage, TimelinePage). Auth bypass noted. Simulation pipeline. File parsing stack.
  - `docs/backend.md` — Added TrendingTagOut model, updated ChatMessageOut (id field), UserProfile (posts_count), EnhanceRequest/Response/UploadResponse models. New chatbot endpoints. Updated simulate_router (structured JSON + max_tokens=1500). Updated chatbot_service (enhance_content, extract_text_from_file). Updated frontend integration table (22 endpoints).
  - `docs/setup.md` — Auth bypass noted. Section on re-enabling auth. Updated first-time flow (all 7 pages).
  - `docs/improvements.md` — Updated gap analysis to reflect current state. Marks what's now built vs. still missing.
