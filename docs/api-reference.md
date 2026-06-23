# UniMind / UniFund API Reference

Base URL: `http://localhost:8000`
API prefix: every route is mounted under `/api`.
Swagger: `http://localhost:8000/docs`

> **Naming note:** The project is mid-rebrand from **UniMind** → **UniFund**. The codebase still uses both names. The literal identifiers that matter to API clients are the localStorage token keys: `unifund_token` (user) and `unifund_dev_token` (developer). The guest account email is `guest@unifund.app`.

## Authentication model

Two independent token types, both HS256 JWTs signed with `JWT_SECRET`:

| Token | Header | Obtained via | Lifetime | Dependency that guards routes |
|---|---|---|---|---|
| User | `Authorization: Bearer <token>` | `/api/auth/signup`, `/api/auth/login`, `/api/auth/guest` | 7 days | `get_current_user` |
| Developer | `Authorization: Bearer <token>` | `/api/dev/auth` | 12 hours | `get_dev_user` (requires `role: "developer"` claim) |

The frontend (`src/lib/api.js`) automatically calls `/api/auth/guest` and retries once if any non-auth request returns `401` — so in practice the app is always authenticated as at least a guest.

CORS: `allow_origin_regex = http://(localhost|127\.0\.0\.1):\d+` — any localhost/127.0.0.1 port is allowed (not just 5173).

---

## Health

### GET /api/health
Response: `{ "status": "ok", "service": "UniMind API" }`

---

## Auth — `/api/auth`

### POST /api/auth/signup
```json
{ "email": "you@example.com", "password": "secret123", "name": "Sudeep" }
```
Response (`TokenResponse`): `{ "access_token": "...", "token_type": "bearer", "user_id": "...", "name": "Sudeep" }`
Errors: `400` if email already registered.

### POST /api/auth/login
```json
{ "email": "you@example.com", "password": "secret123" }
```
Response: same shape as signup. `401` on bad credentials.

### POST /api/auth/guest
No body. Creates (or re-uses) a single shared guest user (`id = guest-0000…`, name `Explorer`, email `guest@unifund.app`) and returns a `TokenResponse` for it. Idempotent via `INSERT OR IGNORE` keyed on the fixed id — safe against React StrictMode double-invocation.

---

## Users — `/api/users` *(user token)*

### GET /api/users/me
Returns the current user's profile.
```json
{
  "id": "...",
  "email": "you@example.com",
  "name": "Sudeep",
  "focus": "Founder",
  "goal": "Start a Company",
  "fear": "Financial Risk",
  "agent_bio": "Sudeep is a driven founder...",
  "agent_skills": ["Python", "AI/ML"],
  "agent_score": 250,
  "onboarding_complete": true,
  "posts_count": 4,
  "chunks_saved": 9
}
```
> `posts_count` and `chunks_saved` are computed at query time via `COUNT(*)` on `posts` / `knowledge_chunks`.

### POST /api/users/me/onboarding
```json
{
  "focus": { "choice": "Student", "custom": "" },
  "goal":  { "choice": "Masters Abroad", "custom": "" },
  "fear":  { "choice": "Failure", "custom": "" }
}
```
For each field, `custom` is stored if non-empty, otherwise `choice`. Response: the updated `UserProfile` with `onboarding_complete: true`.

---

## Agents — `/api`

### GET /api/agents?page=1&size=100
Paginated slice of the 1,401 in-memory agents. `size` max 500.

### GET /api/agents/search?q=ARIA
Case-insensitive substring match against **`name` or `full_name`**. Returns up to 20 results.

---

## Posts — `/api`

### GET /api/posts
50 most recent posts, newest first, each with its reactions map. No auth.

### GET /api/posts/trending
Top 6 tags by post count. No auth.
```json
[ { "tag": "Simulation", "count": 14 }, { "tag": "Insight", "count": 9 } ]
```
> Registered **before** `POST /api/posts` so FastAPI doesn't treat `trending` as a post id.

### POST /api/posts *(user token)*
```json
{ "text": "My post content", "tag": "Insight" }
```
Stores the post as `agent_name = name.upper()`, `icon = "★"`, `type = 3`. Initializes reactions `⚡ ✨ 💫` at 0. Returns the created `PostOut`.

### POST /api/posts/{id}/react *(user token)*
```json
{ "emoji": "⚡" }
```
Atomic upsert (`ON CONFLICT(post_id, emoji) DO UPDATE SET count = count + 1`). Response: `{ "emoji": "⚡", "count": 143 }`

---

## Simulation — `/api`

### POST /api/simulate *(user token)*
No request body — uses the current user's profile, onboarding answers, and up to 15 most-recent knowledge chunks.

```json
{
  "simulation": {
    "paths": [
      {
        "title": "The Builder",
        "icon": "🏗",
        "probability": 45,
        "tagline": "You ship something the world uses.",
        "milestones": [
          { "month": 1, "event": "Define your core idea and validate it" },
          { "month": 3, "event": "Ship MVP to first 50 users" },
          { "month": 6, "event": "Full-time founder with real traction" }
        ],
        "agent_match": "ARIA — shares your builder trajectory"
      }
    ],
    "collective_insight": "The network has spoken — your signal is clear. Move."
  },
  "knowledge_count": 8
}
```

Key facts:
- Response is wrapped in a `simulation` object (changed from the old flat shape). `milestones` are now **objects** `{month, event}`, not strings.
- Exactly 3 paths; probabilities should sum to 100.
- Falls back to a hardcoded 3-path template (`output_type = "fallback"`) on any JSON parse/validation error.
- Logs the call to `llm_logs` and `simulation_logs`, and updates `users.last_active`.
- For real LLM output it queues a background **simulation eval** (Pipeline 2 — see Developer section).

---

## Network — `/api`

### GET /api/leaderboard
Top 12 agents by score. Each item: `rank`, `idx`, `name`, `full_name`, `icon`, `score`, `type`.

### GET /api/network/growth?timeframe=this
`timeframe`: `past` | `this` | `all` (default `this`).
```json
{ "label": "This Month", "count": 1763, "delta": "+56%", "growth": [1129, 1280, 1450, 1620, 1763] }
```
| Timeframe | Label | Count | Delta |
|---|---|---|---|
| `past` | Past Month | 1129 | +56% |
| `this` | This Month | 1763 | +56% |
| `all` | All Time | 2847 | +23608% |

---

## Achievements — `/api` *(user token)*

### GET /api/achievements/{user_id}
Returns all 6 badges with `earned` flags. `first_node` is always earned for any existing account.

| Key | Icon | Label | Color | Earn condition |
|---|---|---|---|---|
| `first_node` | ★ | First Node | `#FFD54F` | Account exists (always) |
| `seer` | 🔮 | Seer | `#B388FF` | Run 1 simulation |
| `connected` | 🌐 | Connected | `#4FC3F7` | Link to 10 agents |
| `signal` | ⚡ | Signal | `#00D1FF` | Phase 1 complete |
| `evolution` | 🧬 | Evolution | `#B388FF` | Run 10 simulations |
| `diamond` | 💎 | Diamond | `#E3F2FD` | Score 1000+ |

> Earn conditions are descriptive labels; only `first_node` is auto-granted. Other badges become `earned: true` once a matching row exists in the `achievements` table (no route currently writes them automatically).

---

## Chatbot — `/api/chatbot` *(user token)*

### POST /api/chatbot/message
```json
{ "content": "I have 3 years of Python experience and I'm pivoting to AI." }
```
Response (`ChatResponse`):
```json
{
  "message": { "id": "abc-123", "role": "assistant", "content": "...", "created_at": "2026-06-21T10:30:00+00:00" },
  "profile_update": { "bio": "...", "skills": ["Python"], "chunks_saved": 3 }
}
```
Flow:
1. First-ever message (no history) returns the canned `OPENING_MESSAGE` — no LLM call.
2. Otherwise: saves the user message, calls the LLM (logging tokens/latency to `llm_logs`, updating `last_active`), saves the reply.
3. Runs knowledge extraction; if a chunk is saved it rebuilds `agent_bio`/`agent_skills`, returns `profile_update`, and queues a background **chunk eval** (Pipeline 1).
4. `profile_update` is `null` when nothing was extracted. Extraction failures are non-blocking.

### GET /api/chatbot/history
Full conversation, oldest-first. `list[ChatMessageOut]` — each item has `id`, `role`, `content`, `created_at`.

### GET /api/chatbot/chunks
The user's knowledge chunks, oldest-first: `[{ "content": "...", "category": "skill", "created_at": "..." }]`.

### DELETE /api/chatbot/history
Deletes **all** chat messages for the user. Response: `{ "deleted": true }`.
> Behavior change: this no longer re-seeds the opening message. The next `POST /message` will return the opening message again because history is empty.

### DELETE /api/chatbot/history/{message_id}
Deletes one message (ownership-checked). Response: `{ "deleted": true }`. `404` if not found / not owned.

### POST /api/chatbot/enhance
```json
{ "content": "I know Python" }
```
Response (`EnhanceResponse`):
```json
{
  "enhanced": "I have three years of hands-on Python experience...",
  "flagged": false,
  "hallucinations": []
}
```
Expands a brief input into a richer first-person statement, then runs the **enhancement hallucination guard** (Pipeline 3) which compares the expansion against the original + the user's chunks. `flagged`/`hallucinations` report invented facts. The call is logged to `enhance_logs`.

### POST /api/chatbot/upload
`multipart/form-data` with a `file` field.
Supported: `application/pdf` (pypdf), `…wordprocessingml.document` (.docx via python-docx), `text/plain` (UTF-8), images `png/jpeg/webp/gif` (Azure OpenAI vision). `400` for anything else.
Response (`UploadResponse`):
```json
{ "extracted_text": "...", "file_type": "pdf", "file_name": "resume.pdf" }
```
Text output is truncated to ~4000 chars per file.

### POST /api/chatbot/knowledge
```json
{ "content": "Expert in Python ML", "category": "skill" }
```
`category` ∈ `{skill, experience, goal, fear, general}` (`400` otherwise). Response: `KnowledgeChunkOut`.

---

## Runway (UniFund) — `/api/runway` *(user token)*

Personal finance tracker. CRUD endpoints persist to the `runway_*` tables; `simulate` and `tip` are LLM-backed (gpt-5-chat) with deterministic fallbacks.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/runway/profile` | Savings balance (`{savings_balance}`) |
| PUT | `/api/runway/profile` | Update savings balance |
| GET | `/api/runway/income` | List income sources |
| POST | `/api/runway/income` | Add income source |
| PUT | `/api/runway/income/{id}` | Update amount/active/label |
| DELETE | `/api/runway/income/{id}` | Delete income source |
| GET | `/api/runway/categories` | List spending categories |
| GET | `/api/runway/transactions` | List transactions (newest first) |
| GET | `/api/runway/accounts` | List linked bank accounts |
| POST | `/api/runway/accounts` | Add bank account |
| DELETE | `/api/runway/accounts/{id}` | Delete bank account |
| GET | `/api/runway/charts` | `{daily_spend: [...], runway_proj: [...]}` |
| POST | `/api/runway/simulate` | AI savings plan (see below) |
| POST | `/api/runway/tip` | AI one-line tip for a single transaction |

### POST /api/runway/simulate
```json
{ "monthly_income": 1200, "expenses": [ { "id": "rent", "label": "Rent", "amount": 520 } ] }
```
Returns income/spend/surplus math, a fixed/variable/subs/savings split, a 20%-of-income target, yearly projections, `knowledge_count`, `personalised`, and 4 LLM-generated `recommendations` (`{title, detail, impact}`). Falls back to 4 canned recommendations on any LLM error.

### POST /api/runway/tip
```json
{ "merchant": "Deliveroo", "category": "Food", "amount": -22.5, "date_label": "Today" }
```
Response: `{ "tip": "…", "personalised": true }`. Uses the user's chunks + matching category budget for context.

---

## Agent Studio — `/api` *(user token)*

### POST /api/studio/run
Multi-agent résumé-tailoring pipeline (ARIA → SCOUT → NEXUS → LENS → RESUME).
```json
{ "task": "resume", "job_description": "<paste full JD>" }
```
`400` if `job_description` is empty. Runs 3 sequential LLM calls (JD analysis → profile match → résumé build) seeded with the user's knowledge chunks, then returns:
```json
{
  "jd_analysis": { "role": "...", "company": "...", "skills_required": [...], "level": "mid", ... },
  "match_analysis": { "matching_skills": [...], "missing_skills": [...], "match_score": 78, ... },
  "resume": { "summary": "...", "skills_technical": [...], "experience": [...], "education": [...], "projects": [...] },
  "agent_logs": [ { "from_agent": "ARIA", "to_agent": "SCOUT", "message": "...", "delay_ms": 0 } ],
  "user_name": "Sudeep"
}
```
`agent_logs` drive the front-end "Space Arena" agent-to-agent animation. Logged to `llm_logs` as one `studio_resume` entry.

---

## Developer control plane — `/api/dev` *(developer token, except `/auth`)*

### POST /api/dev/auth
```json
{ "email": "admin@unimind.dev", "password": "unimind-dev-2025" }
```
Validates against `DEV_CREDENTIALS` (env-overridable) and returns `{ "token": "...", "email": "..." }`. The token carries `role: "developer"` and lasts 12h.

Default dev logins (override via `DEV_EMAIL_1`, `DEV_EMAIL_2`, `DEV_PASS`):
```
admin@unimind.dev / unimind-dev-2025
team@unimind.dev  / unimind-dev-2025
```

### LLM health
| Method | Path | Returns |
|---|---|---|
| GET | `/api/dev/llm/stats` | tokens today/total, est. cost, fallback rate, avg latency, calls today |
| GET | `/api/dev/llm/recent` | last 40 LLM calls |
| GET | `/api/dev/llm/hourly` | token totals per hour, last 24h |

### Funnel & users
| Method | Path | Returns |
|---|---|---|
| GET | `/api/dev/funnel` | signed_up → chatbot_complete → ran_simulation → posted + recent signups |
| GET | `/api/dev/users` | all users with chunk/sim counts, last_active, suspended, quality label |
| POST | `/api/dev/users/{id}/clear` | wipe a user's chunks + chat, reset bio/skills/score |
| POST | `/api/dev/users/{id}/suspend` | toggle `suspended` flag |

### Posts, broadcast, flags
| Method | Path | Purpose |
|---|---|---|
| DELETE | `/api/dev/posts/{id}` | delete a post + its reactions |
| POST | `/api/dev/broadcast` | post a `📢` system announcement to the community feed |
| GET | `/api/dev/flags` | current feature flags (`simulations`, `community`, `chatbot`, `enhance`) |
| POST | `/api/dev/flags` | toggle one or more flags |

### Simulation & community telemetry
| Method | Path | Returns |
|---|---|---|
| GET | `/api/dev/simulations/stats` | total/today/fallback rate/avg chunks |
| GET | `/api/dev/simulations/recent` | last 40 simulation logs |
| GET | `/api/dev/simulations/daily` | counts per day, last 7 days |
| GET | `/api/dev/community/stats` | posts/reactions per day, totals, zero-engagement count, top 6 posts |

### LLM quality pipelines
| Method | Path | Pipeline | Returns |
|---|---|---|---|
| GET | `/api/dev/chunks/stats` | 1 — Chunk eval | avg score, totals, below-threshold, score distribution |
| GET | `/api/dev/chunks/worst` | 1 | 20 lowest-scored chunks |
| GET | `/api/dev/chunks/best` | 1 | 20 highest-scored chunks |
| GET | `/api/dev/chunks/all` | 1 | 50 most-recent evaluated chunks |
| GET | `/api/dev/chunks/by-user` | 1 | per-user chunk score summary |
| POST | `/api/dev/chunks/{id}/eval` | 1 | queue one chunk for background eval |
| POST | `/api/dev/chunks/eval-all` | 1 | queue up to 50 pending chunks |
| GET | `/api/dev/simulations/eval/stats` | 2 — Sim eval | avg personalisation/groundedness/overall, hallucination rate |
| GET | `/api/dev/simulations/eval/recent` | 2 | last 30 simulation evals |
| GET | `/api/dev/enhance/stats` | 3 — Enhance guard | total/flagged/hallucination rate |
| GET | `/api/dev/enhance/logs` | 3 | last 40 enhancement logs |

See [backend.md](backend.md) for the full eval-pipeline mechanics and the schemas in `models/dev.py`.
