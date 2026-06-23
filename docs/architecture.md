# UniMind / UniFund Architecture

> The product is mid-rebrand **UniMind → UniFund**; both names appear in the code. See the naming note in [api-reference.md](api-reference.md).

## System Overview

```
Browser (any localhost port, dev server on 5173)
    │
    │  fetch() via src/lib/api.js
    │   ├─ user token  (localStorage: unifund_token)      → most routes
    │   └─ dev token   (localStorage: unifund_dev_token)  → /api/dev/*
    │
FastAPI Backend (localhost:8000)
    │
    ├── SQLite (unimind.db / unifund.db)
    │       core:   users, knowledge_chunks, chat_messages, posts, reactions, achievements
    │       telemetry: llm_logs, simulation_logs, feature_flags, broadcast_messages
    │       evals:  simulation_evals, enhance_logs  (+ eval_* columns on knowledge_chunks)
    │       runway: runway_profile, runway_income_sources, runway_categories,
    │               runway_transactions, runway_bank_accounts, runway_chart_data
    │
    └── Azure OpenAI (gpt-5-chat)
            chatbot, life simulation, content enhance, file vision,
            runway plan/tips, agent-studio résumé pipeline, 3 quality-eval pipelines
```

---

## Folder Structure

```
unimind-react/                 ← git root (do NOT rename)
├── frontend-react/            ← React 18 + Vite + Three.js + Framer Motion
│   └── src/
│       ├── App.jsx            ← Router + bottom nav + guest-token bootstrap
│       ├── lib/
│       │   ├── api.js         ← ALL API calls (user + dev), auto guest-token refresh
│       │   ├── scene.js       ← Three.js particle morphing (Onboarding)
│       │   ├── scene2.js      ← Three.js network graph (Agentic Web)
│       │   └── agentData.js   ← 1,401 agent defs + BFS pathfinding
│       ├── components/
│       │   ├── SpaceArena.jsx     ← agent-to-agent "space arena" simulation
│       │   └── VoxelCharacter.jsx ← level-based humanoid avatar
│       ├── data/
│       │   └── knowledgeBase.js   ← local demo data (levels, MCP tools, Sudeep profile, scenarios)
│       └── pages/
│           ├── OnboardingPage.jsx   ← chat-style questions + 3D particles
│           ├── AgenticWebPage.jsx   ← 3D network + simulation + simulator panel
│           ├── TimelinePage.jsx     ← 3 life-path cards + context-quality banner
│           ├── CommunityPage.jsx    ← social feed (real API)
│           ├── RunwayPage.jsx       ← finance tracker (AI plan + tips via API)
│           ├── AgentStudioPage.jsx  ← "Agent" tab: MCP tools, levels, résumé pipeline
│           ├── DeveloperLoginPage.jsx ← /developer terminal login
│           ├── DeveloperPage.jsx    ← developer control plane (telemetry + evals)
│           └── (dead/unused: ChatbotPage, SplashPage, LoginPage, SignupPage,
│                              SignInPage, DeveloperSignUpPage)
├── backend-python/            ← FastAPI + SQLite + Azure OpenAI
│   ├── main.py                ← app factory, CORS regex, 11 router mounts
│   ├── db.py                  ← schema (17 tables) + migrations + get_db()
│   ├── auth.py                ← user JWT + dev JWT + bcrypt
│   ├── models/                ← Pydantic: user, chat, post, agent, dev, runway
│   ├── routers/               ← auth, users, agents, posts, simulate, network,
│   │                            achievements, chatbot, dev, runway, agent_studio
│   ├── services/
│   │   ├── agent_seed.py      ← xorshift32 port → 1,401 agents in memory
│   │   ├── azure_openai.py    ← AsyncAzureOpenAI client, chat_complete(), simulate_life()
│   │   ├── chatbot_service.py ← prompts, extraction, bio, enhance, file-OCR
│   │   └── eval_service.py    ← 3 LLM quality pipelines (chunk / sim / enhance)
│   └── seed_data/
│       ├── posts_seed.py      ← 10 seed community posts
│       ├── runway_seed.py     ← "Ramya" demo account + runway data
│       └── run_seed.py        ← create tables + seed posts + seed Ramya
└── docs/                      ← this folder
```

---

## Frontend Routing (App.jsx)

There is no React Router — `App.jsx` holds a `page` string and `AnimatePresence` plays transitions. Auth is **not** a gate: on mount the app silently obtains a guest token, so every page works immediately.

```
                       ┌─────────────── bottom nav (4 tabs) ───────────────┐
                       ▼            ▼              ▼               ▼
onboarding ──enter──► web        runway          chatbot       community
(transitioning)      (Agentic     (Runway)      (AgentStudio)   (Community)
                      Web)│
                          ├──► timeline   (Continue → after simulation)
                          └──► developer  (Developer button)

/developer URL ──► developer-login ──► developer
```

- **Bottom nav** is shown only on the 4 main tabs (`runway`, `web`, `chatbot`, `community`). The "Agent" tab key is `chatbot` but it renders `AgentStudioPage` (the old `ChatbotPage` is imported but no longer routed).
- **Developer plane** is reached either by visiting `/developer` (starts at `developer-login`) or via the in-app "Developer" button on the Agentic Web page.
- `simulationData` + `simulationKnowledgeCount` flow AgenticWebPage → App → TimelinePage.
- `chatbotCompleteTarget` controls where the Agent tab's back button returns (defaults to `web`).

---

## Auth Flow

```
Guest (default):  on app mount → POST /api/auth/guest → unifund_token → localStorage
Signup/Login:     POST /api/auth/{signup,login} → unifund_token (overwrites guest)
Developer:        /developer → POST /api/dev/auth → unifund_dev_token (separate key)

On any 401 from a non-auth route, api.js mints a fresh guest token and retries once.
```

The full email/password UI (`LoginPage`, `SignupPage`, `SignInPage`) exists but is not wired into `App.jsx`. The backend signup/login endpoints are live and usable directly.

---

## Chatbot Knowledge Pipeline

```
User types / uploads file / uses Enhance (Agent Studio or Chatbot)
  │
  │── (file)    POST /api/chatbot/upload  → extract_text_from_file()  → {text, file_type, file_name}
  │── (enhance) POST /api/chatbot/enhance → enhance_content() + Pipeline 3 guard → {enhanced, flagged, hallucinations}
  │
  └── POST /api/chatbot/message
        → LLM reply (logged to llm_logs, last_active updated)
        → extract_knowledge(user message)
        → if saved: insert knowledge_chunks, rebuild agent_bio/skills, return profile_update,
                    queue Pipeline 1 chunk-eval (BackgroundTasks)
```

---

## Simulation Pipeline

```
AgenticWebPage: user clicks the Core
  → runSimulate() fires concurrently with the ~5s visual animation
  → POST /api/simulate (no body)
      → fetch profile + onboarding + up to 15 knowledge chunks
      → simulate_life(user_profile, onboarding) → LLM (max_tokens=1500)
      → parse JSON: 3 paths (milestones = {month,event}) + collective_insight
      → fallback template on malformed JSON (output_type="fallback")
      → log to llm_logs + simulation_logs, update last_active
      → if real LLM output: queue Pipeline 2 simulation-eval (BackgroundTasks)
  → response { simulation, knowledge_count } stored in App, passed to TimelinePage
```

---

## LLM Quality Pipelines (`services/eval_service.py`)

Three background evaluators run on `BackgroundTasks` and write to their own tables/columns. They are surfaced read-only in the Developer plane.

| # | Trigger | Function | Writes to | Measures |
|---|---|---|---|---|
| 1 | chunk saved (or dev re-run) | `score_chunk_background` | `knowledge_chunks.eval_*` | chunk quality 1–10 + flags |
| 2 | real simulation output | `score_simulation_background` | `simulation_evals` | personalisation + groundedness + hallucinations |
| 3 | every enhance call | `check_enhancement_hallucinations` | `enhance_logs` | invented facts in the expansion |

Each pipeline also writes its own `llm_logs` row (`chunk_eval` / `sim_eval` and enhance tokens) so eval cost is tracked.

---

## Database (17 tables)

Created in `db.py` via `create_tables()` on startup, plus idempotent `ALTER TABLE` migrations.

**Core:** `users`, `knowledge_chunks`, `chat_messages`, `posts`, `reactions`, `achievements`
**Telemetry / control:** `llm_logs`, `simulation_logs`, `feature_flags` (seeded enabled), `broadcast_messages`
**Eval:** `simulation_evals`, `enhance_logs` (chunk evals live on `knowledge_chunks.eval_*` columns)
**Runway:** `runway_profile`, `runway_income_sources`, `runway_categories`, `runway_transactions`, `runway_bank_accounts`, `runway_chart_data`

Migrations also add `users.suspended`, `users.last_active`, and the `eval_*` columns. See [backend.md](backend.md) for full column lists.

---

## Agent Data

1,401 agents are generated in Python at startup from a port of the frontend `xorshift32` RNG, so names/scores/icons match the Three.js scene exactly. Served from the in-memory `AGENTS` list — no DB.

**Validated checkpoints:** ARIA=9842, NOX=9120, VEDA=8633.

---

## Agents: Real vs. Visual (important)

The word "agent" is used two different ways in this codebase. They are easy to conflate — this section is the disambiguation.

### Visual / data-only "agents" — NOT autonomous, do no work
- **The 1,401 network agents** (`AGENTS` list) are static procedural data: `{idx, name, full_name, type, icon, bio, score}`. They populate the 3D network and the leaderboard. None of them call an LLM, hold runtime state, reason, or message each other. They are display props.
- **The 12 `STUDIO_AGENTS`** (frontend `data/knowledgeBase.js`) are display data for the Agent Studio "Space Arena" and the résumé pipeline cast (ARIA, SCOUT, NEXUS, LENS, RESUME, …).
- **The "agent-to-agent" (A2A) choreography is scripted, not emergent.** `agent_studio_router._build_agent_logs()` returns a **hardcoded** list of from→to messages with fixed `delay_ms`; `components/SpaceArena.jsx` just animates that `logs`/`statuses` data; the Community "A2A badges" are presentation. No agents actually exchange messages at runtime.

### Real "working" units — LLM-backed functions (single model: `gpt-5-chat`)
There is **no autonomous multi-agent runtime**. What actually runs are these prompt-backed capabilities, each a function/route that makes one or more direct Azure OpenAI calls:

| # | Capability | Code |
|---|---|---|
| 1 | Chatbot interviewer | `chatbot_service.build_system_prompt` + `/api/chatbot/message` |
| 2 | Knowledge extractor | `chatbot_service.extract_knowledge` |
| 3 | Agent-bio builder | `chatbot_service.build_agent_bio` |
| 4 | Content enhancer | `/api/chatbot/enhance` |
| 5 | File/image vision | `chatbot_service.extract_text_from_file` (image branch) |
| 6 | Life simulation | `azure_openai.simulate_life` → `/api/simulate` |
| 7 | Runway advisor | `/api/runway/simulate` + `/api/runway/tip` |
| 8 | Résumé pipeline | `/api/studio/run` (3 sequential LLM calls behind the scripted log) |
| 9–11 | Quality evals | `eval_service.py` — chunk / simulation / enhancement guard |

So: **0** of the 1,401 are autonomous working agents; the "real" work is the ~**9** user-facing LLM features (+3 background eval pipelines) above, all on one deployment. The multi-agent appearance is intentional UX theatre over sequential prompt calls.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18.3, Vite 5.3, Three.js 0.128, Framer Motion 10.18, Tailwind 3.4, lucide-react 1.17 |
| Backend | FastAPI 0.111, uvicorn 0.29, aiosqlite 0.20 |
| Auth | JWT (python-jose), bcrypt (passlib 1.7.4 + bcrypt 4.0.1) |
| AI | Azure OpenAI (AsyncAzureOpenAI, gpt-5-chat) |
| File parsing | pypdf 4.3.1, python-docx 1.1.2, pillow ≥12.2 |
| Database | SQLite |
| Dev ports | Frontend 5173 (any localhost port allowed), Backend 8000 |
