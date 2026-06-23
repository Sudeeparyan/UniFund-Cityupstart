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

## Current State of the Project (as of 2026-06-21)

> Product is mid-rebrand **UniMind → UniFund**; both names appear in code. The full, line-by-line reference lives in `docs/` (api-reference, architecture, backend, frontend, setup) — refreshed 2026-06-21 to match the code. This section is the quick map.

### What Is Built and Working

#### Frontend Pages (in `frontend-react/src/pages/`)
| Page | Status | Description |
|---|---|---|
| `OnboardingPage.jsx` | ✅ Routed | Chat-style adaptive questionnaire + 3D particle morphing. Responsive (stacks below `lg`). Passes `answers` to App. |
| `AgenticWebPage.jsx` | ✅ Routed ("Web" tab) | 3D network of 1,401 agents. Simulation fires concurrently with animation. Slide-in Simulator panel + demo query. "Developer" button. |
| `TimelinePage.jsx` | ✅ Routed | 3 LLM life-path cards (milestones are `{month,event}` objects). ContextQualityBanner. ChatbotCTA. |
| `CommunityPage.jsx` | ✅ Routed | Agentic redesign: A2A badges, post-type filters, SortSelector, real ProfileCard/badges, A2AProtocolFeed (client-side). |
| `RunwayPage.jsx` | ✅ Routed | Finance tracker. Mostly local state, but AI savings plan + per-transaction tips call the backend. |
| `AgentStudioPage.jsx` | ✅ Routed ("Agent" tab) | MCP-tool-driven level system (BABY→MAX), chat, résumé pipeline (`/api/studio/run`), right-side Space Arena simulation. **Replaced ChatbotPage as the Agent tab.** |
| `DeveloperLoginPage.jsx` | ✅ Routed (`/developer`) | Terminal-style dev login → `unifund_dev_token`. |
| `DeveloperPage.jsx` | ✅ Routed | Multi-tab control plane on `/api/dev/*`: LLM health, funnel, users, sim/community health, feature flags, broadcast, 3 eval pipelines. |
| _Unused_ | — | `ChatbotPage`, `SplashPage`, `LoginPage`, `SignupPage`, `SignInPage`, `DeveloperSignUpPage` — present but not routed in `App.jsx`. |

Shared: `components/SpaceArena.jsx` + `components/VoxelCharacter.jsx`; local demo data in `data/knowledgeBase.js`.

#### App Routing (`frontend-react/src/App.jsx`)
Page values: `'onboarding'` → `'transitioning'` → `'web'` | `'timeline'` | `'developer'`, plus bottom-nav tabs `'runway'` | `'chatbot'`(=AgentStudio) | `'community'`. `/developer` URL starts at `'developer-login'`.

- **Guest-first auth** — on mount the app silently calls `/api/auth/guest` and stores `unifund_token`; no login screen. `api.js` mints a fresh guest token and retries once on any 401.
- Persistent **bottom nav** (Runway · Web · Agent · Community) shown on the 4 main tabs.
- All pages lazy-loaded except `DeveloperLoginPage`.
- `simulationData` + `simulationKnowledgeCount` flow AgenticWebPage → App → TimelinePage (AgenticWebPage unwraps `res.simulation`).

#### API Layer (`frontend-react/src/lib/api.js`)
Single boundary for all calls. User token `localStorage.unifund_token` (auto guest-refresh on 401); dev token `localStorage.unifund_dev_token` via separate `devRequest()`. Base URL `http://localhost:8000`.

#### Backend Endpoints (11 router groups)
All in `backend-python/routers/`. Full detail in `docs/api-reference.md`.

| Group | Routes |
|---|---|
| auth | `POST /api/auth/{signup,login,guest}` |
| users | `GET /api/users/me` (incl. `posts_count`, `chunks_saved`), `POST /api/users/me/onboarding` |
| agents | `GET /api/agents`, `GET /api/agents/search` (name **or** full_name) |
| posts | `GET /api/posts`, `GET /api/posts/trending`, `POST /api/posts`, `POST /api/posts/{id}/react` |
| simulate | `POST /api/simulate` → `{simulation, knowledge_count}` (3 paths, `{month,event}` milestones; fallback template) |
| network | `GET /api/network/growth`, `GET /api/leaderboard` |
| achievements | `GET /api/achievements/{user_id}` |
| chatbot | `message`, `GET history`, `GET chunks`, `DELETE history` (→`{deleted:true}`, no re-seed), `DELETE history/{id}`, `enhance` (→`flagged`+`hallucinations`), `upload` (→`file_type`+`file_name`), `knowledge` |
| runway | `profile`, `income`, `categories`, `transactions`, `accounts`, `charts` (CRUD) + AI `simulate`, `tip` |
| studio | `POST /api/studio/run` (ARIA→SCOUT→NEXUS→LENS→RESUME résumé pipeline) |
| dev | `POST /api/dev/auth` + ~30 dev-token endpoints (telemetry, funnel, users, flags, broadcast, 3 eval pipelines) |

#### Backend Services
- `services/agent_seed.py` — `xorshift32` port → 1,401 agents in memory. **Validated: ARIA=9842, NOX=9120, VEDA=8633.**
- `services/azure_openai.py` — `AsyncAzureOpenAI` singleton. `chat_complete(messages, temperature=0.8, max_tokens=800, return_usage=False)` (**note: `temperature` is NOT forwarded to the Azure call**) and `simulate_life(user_profile, onboarding)`.
- `services/chatbot_service.py` — prompts, `extract_knowledge`, `build_agent_bio`, `enhance_content`, `extract_text_from_file` (returns `(text, file_type)`).
- `services/eval_service.py` — **3 LLM quality pipelines** (background tasks): chunk quality → `knowledge_chunks.eval_*`; simulation personalisation/groundedness → `simulation_evals`; enhancement hallucination guard → `enhance_logs`.

#### Database (SQLite — default `unimind.db`; `.env.example` uses `unifund.db`)
**17 tables**, created on startup with idempotent `ALTER TABLE` migrations:
- Core: `users` (+`suspended`,`last_active`), `knowledge_chunks` (+`eval_*`), `chat_messages`, `posts`, `reactions`, `achievements`
- Telemetry/control: `llm_logs`, `simulation_logs`, `feature_flags`, `broadcast_messages`
- Eval: `simulation_evals`, `enhance_logs`
- Runway: `runway_profile`, `runway_income_sources`, `runway_categories`, `runway_transactions`, `runway_bank_accounts`, `runway_chart_data`

Seeded (`run_seed.py`) with 10 community posts + demo user **Ramya** (`ramya@unimind.dev` / `ramya2025`) and full Runway data.

### What Is NOT Yet Built / Known Gaps

| Feature / gap | Notes |
|---|---|
| Per-user data isolation | App runs on a single shared **guest** account; real (non-guest) auth pages exist but aren't routed |
| Live activity WebSocket | `CommunityPage` live feed + A2A ticker are client-side only |
| Node journey view | Clicking a node shows a tooltip; full journey view (`idea.md`) not built |
| 3D timeline (Simulation Studio) | Card-based TimelinePage instead of the month-by-month cinematic view |
| Real agent profiles in 3D network | Still procedural seed data; real user agents not injected |
| LLM-driven onboarding | Adaptive question tree, but no LLM per question (`/api/onboarding/chat` not built) |
| `suspended` not enforced | Flag stored but no route rejects suspended users; no indexes / log-retention policy |

---

## Azure OpenAI Config

Credentials live in `backend-python/.env` (NOT committed to git):
```
AZURE_ENDPOINT=https://laya.cognitiveservices.azure.com/
AZURE_API_VERSION=2024-12-01-preview
DEPLOYMENT_NAME=gpt-5-chat          # BIG model (final synthesis)
# ── AI Engine v2 (all optional; app runs without them) ──
MINI_DEPLOYMENT=gpt-5-mini          # cheap tier for routing/extraction/eval/drafts; defaults to BIG if unset
EMBED_BACKEND=auto                  # auto | st | hash  (free local embeddings)
EMBED_MODEL=all-MiniLM-L6-v2        # sentence-transformers model when backend=st/auto
LLM_SUPPORTS_TEMPERATURE=1          # set 0 if the deployment 400s on a custom temperature
```

The `OPENAI_API_KEY` is in `.env`. Never log it or commit it.

> **AI Engine v2 (2026-06-22):** model tiering + free local embeddings + a real
> 10-expert agent council + Graph-RAG + caching. Full detail in
> `docs/ai-architecture.md`. To unlock cost savings in production, set
> `MINI_DEPLOYMENT` to a cheap deployment and keep `sentence-transformers`
> installed (falls back to a deterministic hash-embedding otherwise).

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
| `backend-python/services/azure_openai.py` | Azure OpenAI client. `chat_complete(model=, mini=)` tiered; temperature now forwarded (auto-disables if rejected); `simulate_life(..., peer_context=)`. |
| `backend-python/services/embeddings.py` | **AI v2** — free local embeddings (sentence-transformers → hash fallback) + cosine/top_k. |
| `backend-python/services/expert_agents.py` | **AI v2** — 13 routable specialist personas (+ ARIA) + 4 SPECIAL_AGENTS (SENTINEL/ECHO/ADVOCATE/SKEPTIC). Add an expert here. |
| `backend-python/services/personas.py` | **AI v2** — 6 featured human persona agents (Sudeep/Ramya/Saju/Vinay/Masthan/Geethika); `seed_personas()` makes them real users + embedded cards. |
| `backend-python/services/student_seed.py` | **AI v2** — synthetic survey generator (`generate_students(n)`) + `seed_students()` (batched, free embeddings). Powers 485 real student agents. |
| `backend-python/seed_data/generate_students.py` | Script: writes `seed_data/student_agents.json` (proof) + seeds. `python seed_data/generate_students.py [N] [--no-seed]`. |
| `backend-python/services/orchestrator.py` | **AI v2** — `route_experts`, `run_council`, `route_peers`, `graph_rag_context`, `rebuild_agent_card`. |
| `backend-python/services/llm_cache.py` | **AI v2** — exact-match response cache (€0 repeats); invalidated on chunk change. |
| `backend-python/services/eval_service.py` | 3 background LLM quality pipelines (chunk / simulation / enhance) — now on the mini tier. |
| `backend-python/routers/agent_router.py` | **AI v2** — `POST /api/agent/council`, `GET /api/agent/experts`. |
| `backend-python/routers/dev_router.py` | Developer control plane (`/api/dev/*`); guarded by `get_dev_user`. |
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

### 2026-06-21 — Documentation sync pass (docs only, no code touched)

**Why:** The `docs/` reference set had drifted badly behind the code and was actively misleading anyone (human or AI) reading it. The docs described an ~8-router / 6-table May-2026 backend with bypassed/commented-out auth; the actual code has 11 router groups, 17 tables, guest-first auth, three LLM eval pipelines, a Runway backend, an Agent Studio pipeline, and a full Developer control plane. User explicitly asked to update the docs and **not** touch code.

**Files updated (all in `docs/`):**
- **`api-reference.md`** — full rewrite. Added: dual token model (user `unifund_token` / dev `unifund_dev_token`), CORS-regex note, `/api/auth/guest`, `/api/chatbot/chunks`, corrected `DELETE /history` (now `{deleted:true}`, no opening re-seed), `enhance` (`flagged`+`hallucinations`), `upload` (`file_type`+`file_name`), `users/me` (`chunks_saved`), **new** `/api/simulate` shape `{simulation, knowledge_count}` with `{month,event}` milestone objects, plus full Runway, Agent Studio, and ~30-endpoint Developer sections.
- **`architecture.md`** — full rewrite: new folder tree (components/, data/, new pages), bottom-nav routing + `/developer`, guest-auth flow, 17-table list, the 3 eval pipelines, CORS regex, gpt-5-chat usage map.
- **`backend.md`** — comprehensive rewrite covering all 11 routers, all 17 tables + migrations, dev auth, `eval_service` (3 pipelines), runway/dev/agent-studio routers, and the `chat_complete()` gotcha (temperature param is accepted but **not** forwarded to Azure; default `max_tokens=800`).
- **`frontend.md`** — rewrite: `unifund_token`, guest bootstrap + 401 auto-refresh, full api.js function inventory, bottom-nav App routing, Agent Studio (the "Agent" tab) + Developer plane page docs, `SpaceArena`/`VoxelCharacter` components, `knowledgeBase.js`, Runway-now-API note, dead-files list. Corrected the TimelinePage data shape (`AgenticWebPage` unwraps `res.simulation`, so the page reads `data.paths`, not `data.simulation.paths`).
- **`setup.md`** — guest-first flow, dev-plane login + credentials, Ramya demo account, `DB_PATH` unimind.db-vs-unifund.db caveat, "runs without Azure key (fallbacks)" note.
- **`improvements.md`** — refreshed stale rows (auth, runway, A2A, agent search) + added a "Newly built since May 2026" section (Agent Studio, Developer plane, eval pipelines, Runway backend, guest auth, telemetry).

**Also refreshed:** the CLAUDE.md "Current State of the Project" section above (frontend pages, App routing, the 11-group endpoint map, services incl. `eval_service`, the 17-table list, and the gaps table) + the Key Files table — all brought in line with the code in the same pass.

**Left intentionally unchanged:** `idea.md` and the V1/V2/V3 + PPT files (historical vision / pitch material, not code references). **Note:** `docs/erd.md` and `docs/session-brief-2026-05-31.md` referenced elsewhere in this file do not exist in `docs/`.

**Verification:** docs cross-checked line-by-line against the actual source (`main.py`, `db.py`, `auth.py`, every router/model/service, `api.js`, `App.jsx`, seed files). No code or build changed.

### 2026-06-22 — AI Engine v2: model tiering + free retrieval + real expert-agent council + Graph-RAG + caching

**Why:** User asked to redesign the AI architecture to be *fast, more accurate, and cheap*, with *more expert agents that are real* (not theatre). The old engine used the single big `gpt-5-chat` for everything, forwarded no `temperature`, had no embeddings/retrieval/caching, and the "agents" (ARIA/SCOUT/…) were a hardcoded `_build_agent_logs()` script. This session implements **Phase 0 + the headline P1/P2/P4 pieces** of `docs/make-it-real-plan.md`. Full design in **`docs/ai-architecture.md`**.

**New backend services:**
- **`services/embeddings.py`** — free local embeddings: `sentence-transformers` (`all-MiniLM-L6-v2`, 384-dim, verified working on Python 3.14 / torch 2.10 CPU) with a deterministic **hash-embedding fallback** (always runs offline, €0). `embed`/`embed_batch` (async, off-loop), `cosine`, `top_k`, `to_blob`/`from_blob`, `backend_name()` (every stored vector is tagged so backends are never mixed).
- **`services/expert_agents.py`** — a real roster of **10 specialist personas** (SCOUT, LENS, VEDA, NOX, ABACUS, FORGE, RESUME, NEXUS, ORION, LUME) + ARIA orchestrator. Each has a domain (for embedding routing), keywords (routing boost), and system prompt. Add an expert = append one dict.
- **`services/orchestrator.py`** — `route_experts(query,k)` (free), `run_council(...)` (route → run k experts **in parallel on the MINI tier** → **one** BIG synthesis; returns `answer/confidence/experts[]/agent_logs[]` in the existing SpaceArena shape), `route_peers(...)`, `graph_rag_context(...)` (free peer-outcome retrieval), background `embed_and_store_chunk` + `rebuild_agent_card`.
- **`services/llm_cache.py`** — exact-match response cache (€0 repeats), invalidated when a user's chunks change.

**Modified:**
- **`services/azure_openai.py`** — `chat_complete(..., model=, mini=)` tiering via `MINI_DEPLOYMENT` (defaults to BIG if unset). **Fixed the temperature bug**: it is now actually forwarded, with an auto-fallback that disables it process-wide if a deployment 400s on it. `simulate_life(..., peer_context=)` for Graph-RAG grounding.
- **`db.py`** — 4 new tables (`chunk_embeddings`, `agent_cards`, `agent_messages`, `response_cache`) + indexes on `response_cache`, `chunk_embeddings`, `llm_logs`, `knowledge_chunks`. **17 → 21 tables.**
- **`routers/simulate_router.py`** — Graph-RAG peer grounding + exact-match cache; response gained a `grounding` block (`peers`, `peer_chunks`, `grounded`).
- **`routers/agent_studio_router.py`** — JD-analysis + match steps moved to MINI (résumé build stays BIG); real `route_peers()` retrieval feeds the agent logs; returns `peers_consulted`.
- **`routers/chatbot_router.py`** — extraction on MINI; background chunk-embed + agent-card rebuild on every chunk save (chat + `/knowledge`); cache invalidation.
- **`services/eval_service.py`** — all 3 eval pipelines moved to MINI.
- **`routers/agent_router.py` (new)** + registered in `main.py`: `POST /api/agent/council`, `GET /api/agent/experts`. **api.js** gained `runAgentCouncil(query,k)` + `getExperts()`. **requirements.txt** gained `numpy` + (optional) `sentence-transformers`.

**Tiering recap:** retrieval = €0 (local); routing/extraction/eval/per-expert drafts = MINI; final synthesis = BIG (cached). Set `MINI_DEPLOYMENT` to a cheap deployment in prod to realise the savings; without it the mini tier transparently uses BIG (correct, not cheaper).

**Verification (backend):** `from main import app` loads all routers (72 routes). Smoke test (hash backend): embeddings + `route_experts` route sensibly ("job+fear"→LENS/VEDA/SCOUT; "money+build"→ABACUS/FORGE/LENS); cache keys deterministic; roster=10. Real ST backend confirmed: cos(ml,dl)=0.423 vs cos(ml,money)=0.094. TestClient: `/api/health`=200, `/api/agent/experts`=200 (10 experts), `/api/agent/council` correctly 401s without a token. **Not yet run with live Azure calls** (needs the real key) and **frontend not yet wired to the new council endpoint** — `api.js` bindings exist; surfacing `runAgentCouncil` in AgentStudioPage's chat is the recommended next step. Per-user isolation (P0 auth routing) still pending — agent cards are keyed by `user_id`, so it activates once real auth is routed.

> **Env note:** the VSCode-selected Python interpreter differs from the Anaconda Python the backend runs on (where numpy/torch/sentence-transformers are installed and passed tests). Run the backend with that Anaconda interpreter; IDE "package not installed" hints on `requirements.txt` are from the other interpreter and are harmless.

### 2026-06-23 — More expert agents + real human personas (council expansion + functional leaderboard people)

**Why:** User asked to "implement it and build personas for them" alongside the 6 leaderboard names (Sudeep·Founder 14280, Ramya·AI Explorer 12500, Saju·Builder 11800, Vinay·Student 11200, Masthan·Student 10600, Geethika·Rising Star 10100). Those 6 were **hollow placeholders already in `agent_seed`** (truncated codenames `SUDEEP/RAMYA/SAJU/VINAY/MASTH/GEETH` with those exact scores) — no profile, no knowledge, not matchable. This session (a) expands the council and (b) turns those 6 into **real, network-functional agents**.

**Council expansion (`services/expert_agents.py`):**
- Added 3 routable experts → **13 total**: **ATLAS** (relocation/visa), **QUANT** (calibrated forecaster), **CATALYST** (accountability/momentum).
- Added `SPECIAL_AGENTS` (not in normal routing, power dedicated flows): **SENTINEL** (fact-check guardrail), **ECHO** (future-self), **ADVOCATE**+**SKEPTIC** (debate pair). `special_roster()` added; `AGENTS_BY_ID` now includes them.

**Real personas (`services/personas.py`, NEW):**
- 6 rich personas (bio, focus/goal/fear, skills, 4-6 knowledge chunks each — Sudeep uses his real MSc-AI/Vially/Soliton/IEEE profile).
- `seed_personas()` — **idempotent, offline, €0** (no LLM): upserts each as a real `users` row + `knowledge_chunks` + `chunk_embeddings` + an `agent_cards` row (summary = bio, card vector = local embedding). Verified: 6 users, 26 chunks, 26 embeddings, 6 cards; re-seed does not duplicate.
- Auto-seeded on startup via a **background task** in `main.py` lifespan (never blocks boot); also runnable standalone via `seed_data/seed_personas.py`.

**Wiring:**
- `routers/network_router.py` — `/api/leaderboard` now merges featured personas + procedural agents, ranks by score, and **dedupes** the old placeholders (`is_persona_placeholder()`). Verified order: the 6 personas top the board, then ARIA/NOX…
- `routers/agent_router.py` — new `GET /api/agent/network` (featured personas), `GET /api/agent/mentors` (**MENTOR-MATCH** via `orchestrator.match_mentors` → `route_peers`), `POST /api/agent/debate` (ADVOCATE vs SKEPTIC → ARIA judge). `GET /api/agent/experts` now also returns `special`.
- `services/orchestrator.py` — added `run_debate()` and `match_mentors()`; retrieval thresholds are now **backend-aware** (`emb.retrieval_threshold()`: 0.05 hash / 0.22 ST) so matching works on both embedding backends.
- `services/embeddings.py` — added `retrieval_threshold()`.
- `api.js` — added `runAgentDebate`, `getMentors`, `getFeaturedNetwork`.

**Verification (hash backend = worst case):** mentor-match is semantically correct — a SWE-intern profile → **Vinay** top; a founder/builder profile → **Saju** then **Sudeep Aryan**. With real ST embeddings the scores sharpen. Leaderboard deduped (12 rows, personas 1-6). `/api/agent/experts` = 13 experts + 4 special. Endpoints auth-guarded (401 without token). **Not yet run with live Azure** (debate/council synthesis need the key) and **frontend not yet surfacing mentors/debate/council** — `api.js` bindings exist; wiring them into AgentStudio/Community is the next step.

### 2026-06-23 — 485 synthetic student agents (real, embedded, functional)

**Why:** User submitted a 9-question student survey form and asked to create **485 student agents** (mostly international — Indian/Chinese/etc.) from synthetic answers, "create agent and improve it … instead of static, I need proof in JSON." Goal: make the network's "thousands of students" claim real, not procedural decoration.

**Built:**
- **`services/student_seed.py`** — `generate_students(n=485, seed=4825)` (deterministic): weighted international name pools (India 36% / China 22% / Vietnam / Nigeria / Pakistan / Korea / Bangladesh / Iran / Brazil / Ireland), all 9 survey questions with realistic weighted distributions, and `_survey_to_agent()` that derives focus/goal/fear/bio/skills + 6 knowledge chunks + an engagement score from each answer set. `seed_students()` inserts them as real `users` + `knowledge_chunks` + `chunk_embeddings` + `agent_cards`, **batching all embeddings in one model pass** (free, no LLM), idempotent.
- **`seed_data/generate_students.py`** — writes **`seed_data/student_agents.json`** (the JSON proof: 485 records, each with raw `survey` answers + derived `agent`) and seeds. `python seed_data/generate_students.py [N] [--no-seed]`.
- **`/api/agent/population`** (new, in `agent_router.py`) — live dynamic counts (real_student_agents / featured_personas / ambient_test_agents / total / embedded_agent_cards / knowledge_embeddings). Proof the network is real, not static.

**Seeded into the real `./unimind.db`** with sentence-transformers embeddings — verified: **485 student agents + 6 personas = 491 agent cards, 2,936 chunk embeddings (backend `st:all-MiniLM-L6-v2`)**. Distributions confirmed (India 182 / China 102 / Vietnam 39 …; Undergrad 249 / Postgrad 159 / Recent-grad 62). ST mentor-match for an AI/ML student profile returns relevant peers at 69-71% (Bo Guo / Rohan Kapoor / Diya Gupta …). Graph-RAG now grounds simulations on the real student-outcome corpus. Test rows cleaned afterward.

**Note:** the procedural 1,401 `agent_seed` agents remain as the **ambient/"test" population**; the 485 students + 6 personas are the real, matchable agents. Bump `N` in the script for more. **Frontend not yet calling `/api/agent/population`** (leaderboard still merges personas + procedural; students are functional via matching/Graph-RAG but not yet shown as a list in the UI).

### 2026-06-23 — Full end-to-end test pass + 2 critical fixes

**Why:** User asked to run the whole app end to end and resolve all issues. Ran a 29-endpoint suite via TestClient against the real `unimind.db` (real handlers + real DB + **live Azure** calls), booted the real uvicorn server, and built the frontend.

**Bugs found & fixed:**
1. **CRITICAL — auth was completely broken.** Installed `bcrypt` is **5.0.0**, but `passlib==1.7.4`'s bcrypt backend runs a self-test that hashes a >72-byte probe string; bcrypt 5.x raises `ValueError: password cannot be longer than 72 bytes`, so `hash_password()` threw and **`/api/auth/guest` returned 500 — the entire app couldn't authenticate.** Fix: `auth.py` now uses **`bcrypt` directly** (truncating to 72 bytes), dropping passlib. It still verifies existing passlib-made `$2b$` hashes, so seeded/real users keep working. Removed `passlib` from `requirements.txt`; relaxed `bcrypt>=4.0.1`. (Aside: the persona/student seeders had a `try/except` around `hash_password`, so they'd silently stored `password_hash="x"` — harmless, those rows never log in.)
2. **`orchestrator.run_council` `KeyError: 'expert'`** — the confidence calc iterated the `experts` list (which has `route_score` at top level) but accessed `r["expert"]["route_score"]` (that nesting only exists on the `results` list). Fixed to `e["route_score"]`.

**Final E2E result: 29/29 endpoints pass.** Live Azure flows all work: chatbot reply, enhance (hallucination guard fired `flagged=True`), **simulate grounded on 8 real peer chunks** (`grounding.grounded=True`), studio résumé (`peers_consulted=3`, 9 logs), **council** (routes SCOUT/VEDA/ORION, confidence 71, real fused answer), debate (5 logs). Real uvicorn server boots clean and serves live HTTP (`/api/auth/guest`, `/api/agent/population`, `/api/leaderboard`, `/api/agent/experts` all 200). **Frontend `npx vite build` → 0 errors** (only the pre-existing three.js >500 kB chunk-size warning). `/api/agent/population` live: 485 students + 6 personas + 1407 ambient = 1898 agents, 491 cards, 2936 embeddings.
