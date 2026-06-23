# UniMind / UniFund Python Backend — Documentation

> Complete reference for the backend codebase. Covers every file, table, route, service, and data-flow pattern so a developer or AI agent can understand the backend without reading all the source first.
>
> **Naming:** mid-rebrand UniMind → UniFund. The DB default file is `unimind.db` (see Config). The frontend stores its user token under `unifund_token` and dev token under `unifund_dev_token`.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [File Structure](#3-file-structure)
4. [Configuration & Environment](#4-configuration--environment)
5. [Application Entry Point (`main.py`)](#5-application-entry-point-mainpy)
6. [Database Layer (`db.py`)](#6-database-layer-dbpy)
7. [Authentication (`auth.py`)](#7-authentication-authpy)
8. [Data Models (`models/`)](#8-data-models-models)
9. [Router: Auth](#9-router-auth)
10. [Router: Users](#10-router-users)
11. [Router: Agents](#11-router-agents)
12. [Router: Posts](#12-router-posts)
13. [Router: Chatbot](#13-router-chatbot)
14. [Router: Simulate](#14-router-simulate)
15. [Router: Network](#15-router-network)
16. [Router: Achievements](#16-router-achievements)
17. [Router: Runway](#17-router-runway)
18. [Router: Agent Studio](#18-router-agent-studio)
19. [Router: Developer](#19-router-developer)
20. [Service: Agent Seed](#20-service-agent-seed)
21. [Service: Azure OpenAI](#21-service-azure-openai)
22. [Service: Chatbot](#22-service-chatbot)
23. [Service: Eval (3 pipelines)](#23-service-eval-3-pipelines)
24. [Seed Data](#24-seed-data)
25. [Security Model](#25-security-model)
26. [Key Architecture Patterns](#26-key-architecture-patterns)
27. [Frontend Integration Reference](#27-frontend-integration-reference)

---

## 1. Project Overview

A **FastAPI + SQLite (async) + Azure OpenAI** backend powering the UniMind/UniFund platform: guest/user auth, an LLM chatbot that extracts structured knowledge, 1,401 procedurally-generated agents, community posts, life simulations, a personal-finance "Runway" tracker, an agent-studio résumé pipeline, three LLM quality-evaluation pipelines, and a developer control plane.

Base URL (dev): `http://localhost:8000` · API prefix: `/api` · Swagger: `/docs`.

---

## 2. Tech Stack & Dependencies

From `requirements.txt`:

| Package | Pin | Role |
|---|---|---|
| `fastapi` | 0.111.0 | Web framework |
| `uvicorn[standard]` | 0.29.0 | ASGI server |
| `python-jose[cryptography]` | 3.3.0 | JWT |
| `passlib[bcrypt]` | 1.7.4 | Password hashing |
| `bcrypt` | 4.0.1 | Bcrypt backend (pinned for passlib compat) |
| `aiosqlite` | 0.20.0 | Async SQLite driver |
| `python-dotenv` | 1.0.0 | `.env` loading |
| `openai` | ≥2.38.0 | Azure OpenAI SDK (`AsyncAzureOpenAI`) |
| `pydantic` | ≥2.13.4 | Validation |
| `python-multipart` | 0.0.9 | Multipart/form parsing (uploads) |
| `httpx` | ≥0.28.1 | Async HTTP |
| `pypdf` | 4.3.1 | PDF text extraction |
| `python-docx` | 1.1.2 | DOCX text extraction |
| `pillow` | ≥12.2.0 | Image handling |

```bash
pip install -r requirements.txt
python seed_data/run_seed.py            # first time
python -m uvicorn main:app --reload --port 8000
```

---

## 3. File Structure

```
backend-python/
├── main.py                 # app factory, CORS regex, 11 router mounts, /api/health
├── db.py                   # 17-table schema, migrations, get_db(), DEFAULT_FLAGS
├── auth.py                 # user JWT, dev JWT, bcrypt, get_current_user / get_dev_user
├── requirements.txt
├── .env / .env.example     # secrets (never commit .env)
├── unimind.db              # SQLite file (default; .env.example points at unifund.db)
│
├── models/
│   ├── user.py             # SignupRequest, LoginRequest, TokenResponse, OnboardingPayload, UserProfile
│   ├── chat.py             # ChatMessageIn/Out, KnowledgeChunkIn/Out, ProfileUpdate, ChatResponse,
│   │                         EnhanceRequest/Response, UploadResponse
│   ├── post.py             # PostOut, CreatePostRequest, ReactRequest, TrendingTagOut
│   ├── agent.py            # AgentOut
│   ├── dev.py              # all developer-plane request/response models (~25 classes)
│   └── runway.py           # runway request/response models
│
├── routers/
│   ├── auth_router.py      # /api/auth: signup, login, guest
│   ├── users_router.py     # /api/users: me, me/onboarding
│   ├── agents_router.py    # /api: agents, agents/search
│   ├── posts_router.py     # /api: posts, posts/trending, posts/{id}/react
│   ├── chatbot_router.py   # /api/chatbot: message, history, chunks, enhance, upload, knowledge
│   ├── simulate_router.py  # /api: simulate
│   ├── network_router.py   # /api: network/growth, leaderboard
│   ├── achievements_router.py # /api: achievements/{user_id}
│   ├── runway_router.py    # /api/runway: profile, income, categories, transactions, accounts, charts, simulate, tip
│   ├── agent_studio_router.py # /api: studio/run
│   └── dev_router.py       # /api/dev: ~30 telemetry + eval endpoints
│
├── services/
│   ├── agent_seed.py       # xorshift32 RNG + 1,401 agents (in-memory AGENTS list)
│   ├── azure_openai.py     # AsyncAzureOpenAI client, chat_complete(), simulate_life()
│   ├── chatbot_service.py  # prompts, extract_knowledge, build_agent_bio, enhance_content, extract_text_from_file
│   └── eval_service.py     # Pipeline 1/2/3 scorers + background writers
│
└── seed_data/
    ├── posts_seed.py       # 10 seed community posts
    ├── runway_seed.py      # "Ramya" demo user + full runway dataset
    └── run_seed.py         # create tables + seed posts + seed Ramya
```

---

## 4. Configuration & Environment

`backend-python/.env` (never committed). Template in `.env.example`:

```env
OPENAI_API_KEY=your_azure_openai_key_here
AZURE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_API_VERSION=2024-12-01-preview
DEPLOYMENT_NAME=gpt-5-chat
JWT_SECRET=change_this_to_a_random_64_char_string
DB_PATH=./unifund.db
```

| Variable | Required | Default (code) | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Azure key (not openai.com) |
| `AZURE_ENDPOINT` | Yes | `""` | Azure resource URL |
| `AZURE_API_VERSION` | No | `2024-12-01-preview` | |
| `DEPLOYMENT_NAME` | No | `gpt-5-chat` | Azure deployment |
| `JWT_SECRET` | Yes | `fallback_secret_change_me` | signs both user + dev tokens |
| `DB_PATH` | No | `./unimind.db` | `.env.example` overrides to `./unifund.db` |
| `DEV_EMAIL_1` / `DEV_EMAIL_2` / `DEV_PASS` | No | `admin@unimind.dev` / `team@unimind.dev` / `unimind-dev-2025` | developer-plane credentials |

> If you use `.env.example` verbatim the DB file is `unifund.db`; the code default (no `DB_PATH`) is `unimind.db`. Keep `run_seed.py` and the server pointed at the same file.

---

## 5. Application Entry Point (`main.py`)

App factory with a lifespan that calls `create_tables()` on startup.

**CORS:** `allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+"`, `allow_credentials=True`, all methods/headers — any localhost/127.0.0.1 port is permitted.

**Router mounts (11):**

| Prefix | Tag | Router |
|---|---|---|
| `/api/auth` | auth | `auth_router` |
| `/api/users` | users | `users_router` |
| `/api` | agents | `agents_router` |
| `/api` | posts | `posts_router` |
| `/api` | simulate | `simulate_router` |
| `/api` | network | `network_router` |
| `/api` | achievements | `achievements_router` |
| `/api/chatbot` | chatbot | `chatbot_router` |
| `/api/dev` | developer | `dev_router` |
| `/api/runway` | runway | `runway_router` |
| `/api` | studio | `agent_studio_router` |

**Health:** `GET /api/health → { "status": "ok", "service": "UniMind API" }`

---

## 6. Database Layer (`db.py`)

```python
DB_PATH = os.getenv("DB_PATH", "./unimind.db")

async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
```

> **Critical rule:** `get_db()` already opens/closes via `async with`. Never re-wrap `db` in `async with db:` inside a handler.

`create_tables()` runs `CREATE_TABLES_SQL` (17 `CREATE TABLE IF NOT EXISTS`), then a list of idempotent `ALTER TABLE … ADD COLUMN` migrations (each wrapped in try/except), then seeds `DEFAULT_FLAGS = ["simulations", "community", "chatbot", "enhance"]` into `feature_flags`.

### Tables

**Core**

`users` — `id` PK, `email` UNIQUE, `password_hash`, `name`, `created_at`, `focus`, `goal`, `fear`, `agent_bio` (default `''`), `agent_skills` (JSON string, default `'[]'`), `agent_score` (default 100), `onboarding_complete` (0/1). Migrated columns: `suspended` (default 0), `last_active`.

`knowledge_chunks` — `id` PK, `user_id`, `content`, `category`, `created_at`. Migrated eval columns: `eval_score`, `eval_reason`, `eval_flags` (JSON, default `'[]'`), `eval_status` (default `'pending'`), `eval_raw_response`, `eval_user_message`, `eval_tokens_in`, `eval_tokens_out`, `eval_duration_ms`.

`chat_messages` — `id` PK, `user_id`, `role` (`user`/`assistant`), `content`, `created_at`.

`posts` — `id` PK, `agent_name`, `agent_icon`, `agent_type` (0=New,1=Community,2=Expert,3=You), `agent_score`, `content`, `tag`, `user_id` (nullable; NULL for seed/broadcast), `created_at`.

`reactions` — PK `(post_id, emoji)`, `count` (incremented via `ON CONFLICT DO UPDATE`).

`achievements` — `id` PK, `user_id`, `badge_key`, `earned_at`.

**Telemetry / control**

`llm_logs` — `id`, `user_id`, `user_name`, `call_type` (`chatbot`/`simulation`/`studio_resume`/`chunk_eval`/`sim_eval`/…), `tokens_in`, `tokens_out`, `duration_ms`, `status` (`llm`/`fallback`), `created_at`.

`simulation_logs` — `id`, `user_id`, `user_name`, `chunks_used`, `duration_ms`, `output_type` (`llm`/`fallback`), `created_at`.

`feature_flags` — `key` PK, `enabled` (0/1), `updated_at`.

`broadcast_messages` — `id` autoincrement, `content`, `created_at`.

**Eval**

`simulation_evals` — `id`, `simulation_log_id`, `user_id`, `user_name`, `personalisation`, `groundedness`, `hallucinations` (JSON), `overall`, plus migrated `raw_response`, `chunks_context`, `simulation_output`, `user_prompt`, `tokens_in`, `tokens_out`, `duration_ms`, `created_at`.

`enhance_logs` — `id`, `user_id`, `original`, `flagged` (0/1), `hallucinations` (JSON), plus migrated `enhanced_text`, `raw_guard_response`, `user_prompt`, `tokens_in`, `tokens_out`, `created_at`.

**Runway**

`runway_profile` — `user_id` PK, `savings_balance`, `updated_at`.
`runway_income_sources` — `id`, `user_id`, `type`, `label`, `color`, `amount`, `active`, `created_at`.
`runway_categories` — `id`, `user_id`, `label`, `spent`, `budget`, `color`.
`runway_transactions` — `id`, `user_id`, `date_label`, `merchant`, `category`, `color`, `amount`, `ai_tip`, `created_at`.
`runway_bank_accounts` — `id`, `user_id`, `bank`, `type`, `last4`, `balance`, `accent`, `synced_mins`, `created_at`.
`runway_chart_data` — `user_id` PK, `daily_spend_json`, `runway_proj_json`, `updated_at`.

> No indexes are defined on any table and `llm_logs`/`simulation_logs`/`enhance_logs` have no retention policy — they grow unbounded. `suspended` is stored but no route currently rejects suspended users.

---

## 7. Authentication (`auth.py`)

```python
SECRET_KEY = os.getenv("JWT_SECRET", "fallback_secret_change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
```

**User tokens** — `create_access_token(user_id, name)` → `{sub, name, exp(+7d)}`. `get_current_user` decodes the Bearer token, loads the user row, returns it as a dict (`401` if missing/expired/unknown).

**Dev tokens** — `create_dev_token(email)` → `{sub, role:"developer", exp(+12h)}`. `validate_dev_credentials(email, password)` checks `DEV_CREDENTIALS`. `get_dev_user` decodes the Bearer token and requires `role == "developer"` (`403` otherwise, `401` if invalid).

Passwords: `passlib` bcrypt (`bcrypt==4.0.1` pinned).

---

## 8. Data Models (`models/`)

`models/user.py` — `UserProfile` now includes `posts_count: int = 0` and `chunks_saved: int = 0` (both computed in the route).

`models/chat.py` — `ChatMessageOut.id` is optional. `EnhanceResponse` is `{enhanced, flagged=False, hallucinations=[]}`. `UploadResponse` is `{extracted_text, file_type, file_name}`.

`models/post.py` — `PostOut`, `CreatePostRequest`, `ReactRequest`, `TrendingTagOut`.

`models/agent.py` — `AgentOut(idx, name, full_name, type, icon, bio, score)`.

`models/runway.py` — income/category/transaction/account I/O models, `SimPlanRequest`/`SimPlanOut` (with `SplitOut`, `RecommendationOut`), `TipRequest`/`TipOut`, `ChartsOut`.

`models/dev.py` — ~25 models covering login, LLM stats/logs, funnel, users, sim stats/logs, daily counts, community stats, feature flags, broadcast, chunk-eval stats/rows/summaries, sim-eval stats/rows, enhance stats/rows, and a generic `ActionResponse(ok, message)`.

---

## 9. Router: Auth

`/api/auth` — `POST /signup`, `POST /login`, `POST /guest`. See [api-reference.md](api-reference.md#auth--apiauth). Guest creates/reuses a fixed shared row (`guest@unifund.app`) via `INSERT OR IGNORE` keyed on id.

## 10. Router: Users

`/api/users` *(user token)* — `GET /me` returns the profile plus a live `COUNT(*)` for `posts_count` and `chunks_saved`. `POST /me/onboarding` stores `custom || choice` per field and sets `onboarding_complete=1`.

## 11. Router: Agents

`/api` — `GET /agents` (paginated, `size` ≤ 500), `GET /agents/search?q=` (matches `name` **or** `full_name`, max 20). Both read the in-memory `AGENTS` list.

## 12. Router: Posts

`/api` — `GET /posts` (50 newest + reactions, batch-fetched), `GET /posts/trending` (top 6 tags; declared before `POST /posts`), `POST /posts` *(user token)*, `POST /posts/{id}/react` *(user token)*. Relative timestamps ("2m ago") computed at read time.

## 13. Router: Chatbot

`/api/chatbot` *(user token)*. Helpers: `_get_history` (last 40), `_get_chunks`, `_save_message`, `_save_chunk`.

- `POST /message` — opening-message short-circuit on empty history; otherwise LLM reply (via `chat_complete(..., return_usage=True)`, logged to `llm_logs`, `last_active` updated), then non-blocking knowledge extraction → on save: rebuild bio/skills, return `profile_update`, and queue `score_chunk_background` (Pipeline 1).
- `GET /history` — full history (`ChatMessageOut[]`).
- `GET /chunks` — `[{content, category, created_at}]`.
- `DELETE /history` — deletes all messages, returns `{deleted: true}` (no opening re-seed).
- `DELETE /history/{message_id}` — ownership-checked single delete.
- `POST /enhance` — `enhance_content()` + Pipeline 3 guard; logs to `enhance_logs`; returns `{enhanced, flagged, hallucinations}`.
- `POST /upload` — type-checked multipart; returns `{extracted_text, file_type, file_name}`.
- `POST /knowledge` — manual chunk insert with category allowlist.

## 14. Router: Simulate

`/api` *(user token)*. `POST /simulate` (no body): gathers up to 15 chunks, builds `user_profile` + `onboarding` dicts, calls `simulate_life(user_profile, onboarding)`, strips fences, `json.loads`, validates `paths`. On failure → `_FALLBACK` (3 paths, `milestones` as `{month,event}` objects) with `output_type="fallback"`. Logs to `llm_logs` + `simulation_logs`, updates `last_active`, queues Pipeline 2 for real output. Returns `{simulation, knowledge_count}`.

## 15. Router: Network

`/api` — `GET /network/growth?timeframe=past|this|all` (static `GROWTH_DATA`; counts 1129 / 1763 / 2847), `GET /leaderboard` (top 12 by score, each with `rank, idx, name, full_name, icon, score, type`).

## 16. Router: Achievements

`/api` *(user token)*. `GET /achievements/{user_id}` returns all 6 `DEFAULT_BADGES` with `earned` flags; `first_node` is always earned.

## 17. Router: Runway

`/api/runway` *(user token)*. CRUD over the `runway_*` tables plus two AI endpoints:

- `POST /simulate` — computes income/spend/surplus, a 20% savings target, and a fixed/variable/subs/savings split (`_FIXED_IDS`, `_SUBS_IDS`); `_llm_recommendations()` returns 4 personalised `{title, detail, impact}` items (falls back to `_FALLBACK_RECS`). Returns `SimPlanOut`.
- `POST /tip` — one-line transaction insight using the user's chunks + matching category budget; falls back to a generic tip on error.

Full endpoint list in [api-reference.md](api-reference.md#runway-unifund--apirunway-user-token).

## 18. Router: Agent Studio

`/api` *(user token)*. `POST /studio/run` — three sequential LLM steps: `_scout_analyze_jd` → `_lens_match_profile` → `_resume_build`, all seeded with the user's knowledge chunks; each step has a JSON fallback. `_build_agent_logs()` returns the 9-entry ARIA→…→USER comm timeline for the front-end animation. Logs one `studio_resume` row to `llm_logs`.

## 19. Router: Developer

`/api/dev` — `POST /auth` is open; everything else requires `get_dev_user`. Groups: LLM health, onboarding funnel, user list + clear/suspend, post delete, broadcast, feature flags, simulation/community telemetry, and the three eval pipelines (chunk worst/best/all/by-user + queue endpoints, sim-eval stats/recent, enhance stats/logs). Helpers: `_quality_label(chunks)`, `_today_start()`, `_parse_flags()`. `COST_PER_TOKEN = 0.00003` (placeholder). Full list in [api-reference.md](api-reference.md#developer-control-plane--apidev-developer-token-except-auth).

---

## 20. Service: Agent Seed

`services/agent_seed.py` ports `xorshift32` from `agentData.js` so Python and JS produce identical agents.

```python
def sr(seed: int) -> float:
    seed &= 0xFFFFFFFF
    seed ^= (seed << 13) & 0xFFFFFFFF
    seed ^= (seed >> 17) & 0xFFFFFFFF
    seed ^= (seed << 5)  & 0xFFFFFFFF
    return (seed & 0xFFFFFFFF) / 0xFFFFFFFF
```

30 hand-crafted agents (idx 0–29), procedural agents 30–1399, and a `YOU` user agent at idx 1400. Exposes `AGENTS: list[dict]` built once at import.

> **CRITICAL:** never change the RNG without re-validating against the frontend. Checkpoints: ARIA=9842, NOX=9120, VEDA=8633.

---

## 21. Service: Azure OpenAI

`services/azure_openai.py` — lazy `AsyncAzureOpenAI` singleton (`get_client()`), `DEPLOYMENT` from env.

```python
async def chat_complete(messages, temperature=0.8, max_tokens=800, return_usage=False):
    ...
    response = await client.chat.completions.create(model=DEPLOYMENT, messages=messages, max_tokens=max_tokens)
    ...
```

> **Gotcha:** `temperature` is accepted by `chat_complete()` but **not forwarded** to the Azure call (the `create()` invocation only passes `model`, `messages`, `max_tokens`). The deployment's default temperature is used regardless. Default `max_tokens` is **800**. When `return_usage=True` it returns `{content, tokens_in, tokens_out, duration_ms}` (used everywhere telemetry/eval is logged).

`simulate_life(user_profile, onboarding)` — builds a strict-JSON system prompt (3 paths, `milestones` as `{month,event}`, probabilities sum to 100) + a user message from name/bio/focus/goal/fear/knowledge. Calls with `max_tokens=1500, return_usage=True` and returns `(content, usage_dict)`.

---

## 22. Service: Chatbot

`services/chatbot_service.py`:

- `OPENING_MESSAGE` — canned greeting returned without an LLM call.
- `build_system_prompt(name, chunks)` — sharp 6–8-exchange interviewer prompt; injects the last 10 chunks.
- `extract_knowledge(user_message)` — temp 0.2; returns `{should_save, category, content}` or `None` (non-blocking).
- `build_agent_bio(name, chunks)` — 2-sentence bio from up to 12 chunks; fallback string on error.
- `enhance_content(brief, user_name, chunks)` — expands a brief into 2–4 first-person sentences (temp 0.75, max_tokens 300); returns the brief on error.
- `extract_text_from_file(data, content_type, filename) -> (text, file_type)` — PDF (first 20 pages), DOCX, plain text, or image (base64 vision). All text truncated to ~4000 chars; `file_type` ∈ `text|pdf|docx|image|unknown`.

---

## 23. Service: Eval (3 pipelines)

`services/eval_service.py` runs as `BackgroundTasks` and connects to SQLite directly (`aiosqlite.connect(DB_PATH)`).

**Pipeline 1 — chunk quality.** `score_chunk()` rates a chunk 1–10 with flags (temp 0.1). `score_chunk_background()` writes `eval_*` columns on `knowledge_chunks`, sets `eval_status='done'`, and logs a `chunk_eval` row to `llm_logs`. Triggered on chunk save and by dev `chunks/{id}/eval` + `chunks/eval-all`.

**Pipeline 2 — simulation personalisation.** `score_simulation()` scores `personalisation` + `groundedness` (1–10) and lists `hallucinations`. `score_simulation_background()` inserts into `simulation_evals` and logs a `sim_eval` row. Triggered only for real LLM simulation output.

**Pipeline 3 — enhancement hallucination guard.** `check_enhancement_hallucinations()` compares the AI expansion against the original + chunks, returning `{flagged, hallucinations, …}`. Called inline by `POST /chatbot/enhance` (result stored in `enhance_logs`).

Every pipeline records token usage so eval cost shows up in LLM stats.

---

## 24. Seed Data

- `seed_data/posts_seed.py` — `get_seed_posts()` → 10 community posts (with reactions) matching the frontend's original `INITIAL_POSTS`.
- `seed_data/runway_seed.py` — `seed_ramya()` creates demo user **Ramya** (`ramya@unimind.dev` / `ramya2025`, id `ramya-seed-001`) with a full runway dataset: 3 income sources, 11 categories, 15 transactions, 2 bank accounts, savings balance, and chart data. Idempotent (`INSERT OR IGNORE` / upsert).
- `seed_data/run_seed.py` — creates tables, inserts seed posts (skipping existing), then calls `seed_ramya()`. Safe to re-run.

---

## 25. Security Model

- **JWT** HS256, user 7-day / dev 12-hour, secret from `JWT_SECRET`. Dev routes additionally require the `role:"developer"` claim.
- **Passwords** bcrypt-hashed, salted, never stored/returned in plaintext.
- **SQL** fully parameterized (`?` placeholders) — no string interpolation.
- **CORS** restricted to localhost/127.0.0.1 (any port) via regex.
- **Validation** Pydantic v2 on all bodies; chatbot category allowlist; upload content-type allowlist.
- **Secrets** `.env` git-ignored; Azure key + JWT secret never logged or returned.
- **Known gaps:** `suspended` flag not enforced by any route; no rate limiting; log tables grow unbounded; the shared guest account means guest data is not isolated per browser.

---

## 26. Key Architecture Patterns

1. **Async throughout** — `async def` routes, `aiosqlite`, `AsyncAzureOpenAI`.
2. **Dependency injection** — `Depends(get_db)`, `Depends(get_current_user)`, `Depends(get_dev_user)`. Never re-wrap `db` in `async with`.
3. **In-memory agent store** — 1,401 agents built once at import.
4. **Non-blocking enrichment** — knowledge extraction and all 3 eval pipelines run after the user response is ready; failures never block the request.
5. **Telemetry on every LLM call** — `chat_complete(return_usage=True)` feeds `llm_logs` (tokens, latency, fallback status) consumed by the developer plane.
6. **Deterministic fallbacks** — simulation, runway plan/tips, and studio steps all degrade to canned output on malformed LLM JSON.
7. **xorshift32 parity** — Python `sr()` mirrors JS `xorshift32()` bit-for-bit.

---

## 27. Frontend Integration Reference

All frontend calls go through `frontend-react/src/lib/api.js` (user requests via `request()`, dev requests via `devRequest()`; both auto-attach their respective token). The user-request helper mints a fresh guest token and retries once on `401`.

| Endpoint | HTTP | api.js function |
|---|---|---|
| `/api/auth/guest` | POST | `guestLogin()` |
| `/api/auth/signup` / `login` | POST | `signup()` / `login()` |
| `/api/users/me` | GET | `getMe()` |
| `/api/users/me/onboarding` | POST | `saveOnboarding()` |
| `/api/agents` / `agents/search` | GET | `getAgents()` / `searchAgents()` |
| `/api/posts` | GET/POST | `getPosts()` / `createPost()` |
| `/api/posts/trending` | GET | `getTrendingTags()` |
| `/api/posts/{id}/react` | POST | `reactToPost()` |
| `/api/simulate` | POST | `runSimulate()` |
| `/api/network/growth` / `leaderboard` | GET | `getNetworkGrowth()` / `getLeaderboard()` |
| `/api/achievements/{id}` | GET | `getAchievements()` |
| `/api/chatbot/message` | POST | `sendChatMessage()` |
| `/api/chatbot/history` | GET/DELETE | `getChatHistory()` / `clearChatHistory()` |
| `/api/chatbot/chunks` | GET | `getChatChunks()` |
| `/api/chatbot/history/{id}` | DELETE | `deleteChatMessage()` |
| `/api/chatbot/enhance` | POST | `enhanceContent()` |
| `/api/chatbot/upload` | POST | `uploadFile()` (multipart) |
| `/api/chatbot/knowledge` | POST | `saveKnowledge()` |
| `/api/runway/*` | GET/POST/PUT/DELETE | `getRunway*` / `addRunway*` / `updateRunway*` / `deleteRunway*` |
| `/api/runway/simulate` / `tip` | POST | `runRunwaySimulate()` / `generateTransactionTip()` |
| `/api/studio/run` | POST | `runStudioPipeline()` |
| `/api/dev/auth` | POST | `devLogin()` |
| `/api/dev/*` | GET/POST/DELETE | `getDev*` / `clearDevUser` / `suspendDevUser` / `deleteDevPost` / `broadcastMessage` / `updateDevFlags` / `getChunk*` / `getSimEval*` / `getEnhance*` / `evalOneChunk` / `evalAllPending` |

*Backend covers 11 router groups. The Azure OpenAI integration (chatbot, simulation, enhance, file vision, runway, studio, and the 3 eval pipelines) requires a valid `.env` with `OPENAI_API_KEY` + `AZURE_ENDPOINT`.*
