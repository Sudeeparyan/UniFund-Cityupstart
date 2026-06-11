# UniMind Python Backend — Documentation

> Complete reference for the backend codebase. Covers every file, schema, route, service, and data flow pattern so any developer or AI agent can fully understand the backend structure without needing to read all source files first.

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
9. [Router: Auth (`routers/auth_router.py`)](#9-router-auth-routersauth_routerpy)
10. [Router: Users (`routers/users_router.py`)](#10-router-users-routersusers_routerpy)
11. [Router: Agents (`routers/agents_router.py`)](#11-router-agents-routersagents_routerpy)
12. [Router: Posts (`routers/posts_router.py`)](#12-router-posts-routersposts_routerpy)
13. [Router: Chatbot (`routers/chatbot_router.py`)](#13-router-chatbot-routerschatbot_routerpy)
14. [Router: Simulate (`routers/simulate_router.py`)](#14-router-simulate-routerssimulate_routerpy)
15. [Router: Network (`routers/network_router.py`)](#15-router-network-routersnetwork_routerpy)
16. [Router: Achievements (`routers/achievements_router.py`)](#16-router-achievements-routersachievements_routerpy)
17. [Service: Agent Seed (`services/agent_seed.py`)](#17-service-agent-seed-servicesagent_seedpy)
18. [Service: Azure OpenAI (`services/azure_openai.py`)](#18-service-azure-openai-servicesazure_openaipy)
19. [Service: Chatbot (`services/chatbot_service.py`)](#19-service-chatbot-serviceschatbot_servicepy)
20. [Seed Data (`seed_data/`)](#20-seed-data-seed_data)
21. [Data Flow Diagrams](#21-data-flow-diagrams)
22. [Security Model](#22-security-model)
23. [Key Architecture Patterns](#23-key-architecture-patterns)
24. [Frontend Integration Reference](#24-frontend-integration-reference)

---

## 1. Project Overview

The UniMind backend is a **FastAPI + SQLite async API** that powers the full UniMind agentic web platform. It handles user authentication, a multi-turn LLM chatbot that extracts structured knowledge from conversations, procedural generation of 1,401 AI agents, community posts with reactions, life simulations via Azure OpenAI, and a leaderboard/achievements system.

**Core responsibilities:**

```
Auth (JWT)  →  Chatbot (knowledge extraction)  →  Simulation (LLM life path)
    ↓                    ↓                              ↓
 SQLite DB         Agent Profile Build           4-Phase AI Result
    ↓
 Posts / Reactions / Leaderboard / Achievements
```

**Base URL (local dev):** `http://localhost:8000`  
**API prefix:** All routes start with `/api`  
**Swagger docs:** `http://localhost:8000/docs`

---

## 2. Tech Stack & Dependencies

| Package | Version | Role |
|---|---|---|
| `fastapi` | 0.111.0 | Web framework + route declarations |
| `uvicorn[standard]` | 0.29.0 | ASGI server |
| `pydantic` | 2.7.0 | Data validation and serialization |
| `aiosqlite` | 0.20.0 | Async SQLite database driver |
| `python-jose[cryptography]` | 3.3.0 | JWT token creation and verification |
| `passlib[bcrypt]` | 1.7.4 | Password hashing (bcrypt) |
| `bcrypt` | 4.0.1 | Bcrypt backend (pinned for passlib compat) |
| `openai` | 1.30.0 | Azure OpenAI SDK (`AsyncAzureOpenAI`) |
| `python-dotenv` | 1.0.0 | `.env` file loading |
| `httpx` | 0.27.0 | Async HTTP client |
| `python-multipart` | 0.0.9 | Form data parsing |

**Run commands:**
```bash
# First time only
pip install -r requirements.txt
python seed_data/run_seed.py

# Every time
python -m uvicorn main:app --reload --port 8000
```

---

## 3. File Structure

```
backend-python/
├── main.py                          # FastAPI app factory, CORS, router mounts
├── db.py                            # SQLite schema + get_db() async dependency
├── auth.py                          # JWT creation/verification + get_current_user()
├── requirements.txt                 # Pinned dependencies
├── .env                             # Secrets (never committed)
├── .env.example                     # Template for .env
├── unimind.db                       # SQLite database file (auto-created)
│
├── models/                          # Pydantic request/response schemas
│   ├── __init__.py
│   ├── user.py                      # SignupRequest, LoginRequest, UserProfile, OnboardingPayload
│   ├── agent.py                     # AgentOut
│   ├── chat.py                      # ChatMessageIn/Out, KnowledgeChunkIn/Out, ChatResponse
│   └── post.py                      # PostOut, CreatePostRequest, ReactRequest
│
├── routers/                         # One file per resource group
│   ├── __init__.py
│   ├── auth_router.py               # POST /api/auth/signup, /api/auth/login
│   ├── users_router.py              # GET /api/users/me, POST /api/users/me/onboarding
│   ├── agents_router.py             # GET /api/agents, GET /api/agents/search
│   ├── posts_router.py              # GET/POST /api/posts, POST /api/posts/{id}/react
│   ├── chatbot_router.py            # POST /api/chatbot/message, GET history, POST knowledge
│   ├── simulate_router.py           # POST /api/simulate
│   ├── network_router.py            # GET /api/network/growth, GET /api/leaderboard
│   └── achievements_router.py       # GET /api/achievements/{user_id}
│
├── services/                        # Business logic, external API clients
│   ├── __init__.py
│   ├── agent_seed.py                # xorshift32 RNG + 1,401 agent definitions
│   ├── azure_openai.py              # AsyncAzureOpenAI singleton, chat_complete(), simulate_life()
│   └── chatbot_service.py           # System prompt builder, knowledge extractor, bio builder
│
└── seed_data/                       # One-time DB initialization
    ├── __init__.py
    ├── posts_seed.py                # 10 seed community posts matching frontend INITIAL_POSTS
    └── run_seed.py                  # Script: create tables + insert seed posts
```

---

## 4. Configuration & Environment

**File:** `backend-python/.env` (never committed — use `.env.example` as template)

```env
# Azure OpenAI
OPENAI_API_KEY=your_azure_openai_key_here
AZURE_ENDPOINT=https://laya.cognitiveservices.azure.com/
AZURE_API_VERSION=2024-12-01-preview
DEPLOYMENT_NAME=gpt-5-chat

# Auth
JWT_SECRET=change_this_to_a_random_64_char_string

# Database (optional — defaults to ./unimind.db)
DB_PATH=./unimind.db
```

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Azure key (not OpenAI.com key) |
| `AZURE_ENDPOINT` | Yes | — | Azure resource URL |
| `AZURE_API_VERSION` | No | `2024-12-01-preview` | API version string |
| `DEPLOYMENT_NAME` | No | `gpt-5-chat` | Azure deployment name |
| `JWT_SECRET` | Yes | — | Signing secret for JWT tokens |
| `DB_PATH` | No | `./unimind.db` | SQLite file path |

---

## 5. Application Entry Point (`main.py`)

**Location:** [backend-python/main.py](../backend-python/main.py)

The FastAPI application factory. Configures CORS, mounts all routers, runs startup tasks, and exposes a health check.

### Lifespan (Startup)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()   # Creates all 6 SQLite tables if not present
    yield
```

### CORS Middleware

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Router Mounts

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

### Health Check

```
GET /api/health → { "status": "ok" }
```

---

## 6. Database Layer (`db.py`)

**Location:** [backend-python/db.py](../backend-python/db.py)

Manages the async SQLite connection and defines the full schema.

### Connection

```python
DB_PATH = os.getenv("DB_PATH", "./unimind.db")

async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row   # Rows accessible by column name
        yield db
```

> **Critical rule:** `get_db()` already opens and closes the connection via `async with`. Never wrap `db` in another `async with db:` inside route handlers — it will cause a double-context error.

### Schema — 6 Tables

#### `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID |
| `email` | TEXT | UNIQUE NOT NULL | Lowercased on insert |
| `password_hash` | TEXT | NOT NULL | Bcrypt hash |
| `name` | TEXT | NOT NULL | Display name |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC |
| `focus` | TEXT | — | Onboarding answer (text value) |
| `goal` | TEXT | — | Onboarding answer (text value) |
| `fear` | TEXT | — | Onboarding answer (text value) |
| `agent_bio` | TEXT | DEFAULT '' | LLM-generated bio, updated after each chat turn |
| `agent_skills` | TEXT | DEFAULT '[]' | JSON-encoded string array (up to 8 skills) |
| `agent_score` | INTEGER | DEFAULT 100 | Accumulates as user engages |
| `onboarding_complete` | INTEGER | DEFAULT 0 | Boolean (0/1) |

#### `knowledge_chunks`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID |
| `user_id` | TEXT | FK → users.id | Cascade delete |
| `content` | TEXT | NOT NULL | A single extracted knowledge statement |
| `category` | TEXT | NOT NULL | One of: `skill`, `experience`, `goal`, `fear`, `general` |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC |

#### `chat_messages`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID |
| `user_id` | TEXT | FK → users.id | — |
| `role` | TEXT | NOT NULL | `"user"` or `"assistant"` |
| `content` | TEXT | NOT NULL | Message body |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC |

#### `posts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID or seed ID |
| `agent_name` | TEXT | NOT NULL | Uppercase agent name |
| `agent_icon` | TEXT | NOT NULL | Emoji or symbol |
| `agent_type` | INTEGER | NOT NULL | 0=New, 1=Community, 2=Expert, 3=You |
| `agent_score` | INTEGER | NOT NULL | Agent's score |
| `content` | TEXT | NOT NULL | Post body |
| `tag` | TEXT | NOT NULL | Category label |
| `user_id` | TEXT | FK → users.id (nullable) | NULL for seeded posts |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC |

#### `reactions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `post_id` | TEXT | FK → posts.id | Composite PK |
| `emoji` | TEXT | NOT NULL | Composite PK |
| `count` | INTEGER | DEFAULT 0 | Incremented atomically via `ON CONFLICT DO UPDATE` |

**Primary Key:** `(post_id, emoji)`

#### `achievements`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID |
| `user_id` | TEXT | FK → users.id | — |
| `badge_key` | TEXT | NOT NULL | e.g., `"first_node"`, `"seer"` |
| `earned_at` | TEXT | NOT NULL | ISO 8601 UTC |

---

## 7. Authentication (`auth.py`)

**Location:** [backend-python/auth.py](../backend-python/auth.py)

Handles JWT tokens and password hashing. All protected routes use `Depends(get_current_user)`.

### Configuration

```python
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
```

### Functions

#### `hash_password(password: str) -> str`
Bcrypt-hashes a plain-text password via passlib. Always salted.

#### `verify_password(plain: str, hashed: str) -> bool`
Compares a plain-text password against a stored bcrypt hash.

#### `create_access_token(user_id: str, name: str) -> str`
Creates a JWT with payload `{sub: user_id, name: name, exp: now + 7 days}`. Signs with HS256.

#### `async get_current_user(token, db) -> dict`
FastAPI dependency. Extracts and validates the Bearer token from the `Authorization` header. Fetches the user row from SQLite and returns it as a dict. Raises `HTTP 401` if token is missing, malformed, expired, or the user no longer exists.

**Usage in route:**
```python
@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    ...
```

---

## 8. Data Models (`models/`)

All models are Pydantic v2 classes. Used for request body validation and response serialization.

### `models/user.py`

```python
class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str

class OnboardingPayload(BaseModel):
    focus: dict   # {choice: str, custom: str}
    goal: dict
    fear: dict

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    focus: Optional[str] = None
    goal: Optional[str] = None
    fear: Optional[str] = None
    agent_bio: str = ""
    agent_skills: List[str] = []
    agent_score: int = 100
    onboarding_complete: bool = False
```

### `models/agent.py`

```python
class AgentOut(BaseModel):
    idx: int          # Position in AGENTS list (0–1400)
    name: str         # Short code name, e.g. "ARIA"
    full_name: str    # Display name, e.g. "ARIA · Career Switch"
    type: int         # 0=New, 1=Community, 2=Expert, 3=You
    icon: str         # Emoji or symbol
    bio: str          # One-sentence description
    score: int        # Score metric
```

### `models/chat.py`

```python
class ChatMessageIn(BaseModel):
    content: str

class ChatMessageOut(BaseModel):
    id: Optional[str]  # UUID for per-message deletion
    role: str          # "user" | "assistant"
    content: str
    created_at: str    # ISO 8601

class KnowledgeChunkIn(BaseModel):
    content: str
    category: str      # skill | experience | goal | fear | general

class KnowledgeChunkOut(BaseModel):
    id: str
    content: str
    category: str
    created_at: str

class ProfileUpdate(BaseModel):
    bio: str
    skills: List[str]
    chunks_saved: int

class ChatResponse(BaseModel):
    message: ChatMessageOut
    profile_update: Optional[ProfileUpdate] = None

class EnhanceRequest(BaseModel):
    content: str

class EnhanceResponse(BaseModel):
    enhanced: str

class UploadResponse(BaseModel):
    extracted_text: str
```

### `models/post.py`

```python
class PostOut(BaseModel):
    id: str
    agent: str              # Agent name
    icon: str               # Emoji
    type: int               # 0–3
    score: int
    content: str
    tag: str
    time: str               # Relative: "2m ago", "1h ago"
    reactions: Dict[str, int]

class CreatePostRequest(BaseModel):
    text: str
    tag: str

class ReactRequest(BaseModel):
    emoji: str

class TrendingTagOut(BaseModel):
    tag: str
    count: int
```

### `models/user.py` (updated)

`UserProfile` now includes:
```python
posts_count: int = 0   # computed at query time from posts table
```

---

## 9. Router: Auth (`routers/auth_router.py`)

**Prefix:** `/api/auth`

### `POST /api/auth/signup`

**Request body:** `SignupRequest`

```json
{ "email": "user@example.com", "password": "s3cur3!", "name": "Jane" }
```

**Response:** `TokenResponse`

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user_id": "a1b2-...",
  "name": "Jane"
}
```

**Logic:**
1. Check if email already exists → `HTTP 400` if so.
2. Generate UUID for user id.
3. Hash password with bcrypt.
4. Insert into `users` table with `created_at = datetime.utcnow()`.
5. Create JWT via `create_access_token()`.
6. Return `TokenResponse`.

---

### `POST /api/auth/login`

**Request body:** `LoginRequest`

```json
{ "email": "user@example.com", "password": "s3cur3!" }
```

**Response:** `TokenResponse` (same shape as signup)

**Logic:**
1. Fetch user by email (case-insensitive lookup).
2. `verify_password()` → `HTTP 401` on mismatch.
3. Create JWT and return `TokenResponse`.

---

## 10. Router: Users (`routers/users_router.py`)

**Prefix:** `/api/users`  
**Authentication:** All routes require Bearer token.

### `GET /api/users/me`

Returns the authenticated user's full profile.

**Response:** `UserProfile`

```json
{
  "id": "a1b2-...",
  "email": "user@example.com",
  "name": "Jane",
  "focus": "Career Switch",
  "goal": "Start a Company",
  "fear": "Financial Risk",
  "agent_bio": "Jane is a driven career-switcher...",
  "agent_skills": ["leadership", "coding", "communication"],
  "agent_score": 250,
  "onboarding_complete": true
}
```

**Logic:**
- Reads `current_user` dict from `get_current_user` dependency.
- Parses `agent_skills` JSON string → Python list.
- Returns `UserProfile`.

---

### `POST /api/users/me/onboarding`

Saves onboarding answers. Called by `App.jsx → handleEnter(answers)`.

**Request body:** `OnboardingPayload`

```json
{
  "focus": { "choice": "Career Switch", "custom": "" },
  "goal": { "choice": "Start a Company", "custom": "EdTech startup" },
  "fear": { "choice": "Financial Risk", "custom": "" }
}
```

**Response:** Updated `UserProfile` with `onboarding_complete: true`

**Logic:**
- Extracts `custom` if non-empty, otherwise uses `choice`.
- `UPDATE users SET focus=?, goal=?, fear=?, onboarding_complete=1`.
- Returns full updated profile.

---

## 11. Router: Agents (`routers/agents_router.py`)

**Prefix:** `/api`

### `GET /api/agents`

Returns a paginated slice of all 1,401 agents.

**Query params:**
- `page`: int (default `1`)
- `size`: int (default `100`, max `500`)

**Response:** `list[AgentOut]`

**Logic:** Slices the in-memory `AGENTS` list from `agent_seed.py`.

---

### `GET /api/agents/search?q=`

Full-text search across agent names.

**Query params:**
- `q`: str (minimum 1 character)

**Response:** `list[AgentOut]` (max 20 results)

**Logic:**
- Lowercased substring match against `agent.name`.
- Returns first 20 matches from in-memory `AGENTS` list.

---

## 12. Router: Posts (`routers/posts_router.py`)

**Prefix:** `/api`

### `GET /api/posts`

Fetches the community feed.

**Response:** `list[PostOut]`

**Logic:**
1. `SELECT ... FROM posts ORDER BY created_at DESC LIMIT 50`.
2. For each post, fetch all reactions from `reactions` table.
3. Format `created_at` → relative time string ("2m ago", "1h ago", etc.).
4. Return list of `PostOut`.

---

### `GET /api/posts/trending`

Returns the top 6 post tags by frequency. No auth required.

**Response:** `list[TrendingTagOut]`

```json
[
  { "tag": "Simulation", "count": 14 },
  { "tag": "Insight", "count": 9 }
]
```

**Logic:**
- `SELECT tag, COUNT(*) as count FROM posts GROUP BY tag ORDER BY count DESC LIMIT 6`
- Registered **before** `POST /api/posts` in the router to prevent FastAPI treating `"trending"` as a `{post_id}` path parameter.

---

### `POST /api/posts`

**Authentication:** Required

**Request body:** `CreatePostRequest`

```json
{ "text": "Just connected with ARIA — incredible simulation!", "tag": "Milestone" }
```

**Response:** `PostOut` with reactions initialized to 0.

**Logic:**
1. Insert post: `agent_name = current_user.name.upper()`, `icon = "★"`, `type = 3`, `score = current_user.agent_score`.
2. Initialize 3 default reactions: `["⚡", "✨", "💫"]` with count 0.
3. Return `PostOut`.

---

### `POST /api/posts/{post_id}/react`

**Authentication:** Required

**Request body:** `ReactRequest`

```json
{ "emoji": "⚡" }
```

**Response:**

```json
{ "emoji": "⚡", "count": 143 }
```

**Logic:**
- `INSERT INTO reactions (post_id, emoji, count) VALUES (?, ?, 1) ON CONFLICT DO UPDATE SET count = count + 1`.
- Returns updated `count`.

---

## 13. Router: Chatbot (`routers/chatbot_router.py`)

**Prefix:** `/api/chatbot`  
**Authentication:** All routes require Bearer token.

### `POST /api/chatbot/message`

The core chatbot endpoint. Powers `ChatbotPage.jsx`.

**Request body:** `ChatMessageIn`

```json
{ "content": "I have 3 years of Python experience and I'm pivoting to AI." }
```

**Response:** `ChatResponse`

```json
{
  "message": {
    "role": "assistant",
    "content": "That's a strong foundation...",
    "created_at": "2026-05-17T10:30:00.000Z"
  },
  "profile_update": {
    "bio": "Jane is a Python-fluent developer...",
    "skills": ["Python", "AI/ML"],
    "chunks_saved": 3
  }
}
```

**Full Logic:**

```
1. If user has 0 chat messages → return OPENING_MESSAGE (no LLM call).
2. Save user message to chat_messages table.
3. Fetch chat history (last 40 messages).
4. Fetch user's knowledge_chunks (all).
5. Build system prompt via build_system_prompt(name, chunks).
6. Call chat_complete(messages=[system, ...history]) → assistant reply.
7. Save assistant reply to chat_messages.
8. Run extract_knowledge(user_message) → {should_save, category, content}.
9. If should_save:
   a. Insert into knowledge_chunks.
   b. Fetch updated chunks.
   c. Call build_agent_bio(name, chunks) → new bio.
   d. Parse skills from chunks (up to 8 "skill" category entries).
   e. UPDATE users SET agent_bio=?, agent_skills=?.
   f. Set profile_update in response.
10. Return ChatResponse.
```

> **Note:** Step 8–9 runs async but errors are non-blocking — the chat reply is returned even if knowledge extraction fails.

---

### `GET /api/chatbot/history`

Returns the full conversation history for the current user.

**Response:** `list[ChatMessageOut]` ordered `ASC` by `created_at`. Each item includes `id` for deletion.

---

### `DELETE /api/chatbot/history`

Clears all chat messages for the current user and re-seeds the opening message.

**Response:**
```json
{ "cleared": 14, "opening_message": { "id": "...", "role": "assistant", "content": "...", "created_at": "..." } }
```

**Logic:**
1. `DELETE FROM chat_messages WHERE user_id = ?`
2. Re-insert the `OPENING_MESSAGE` and return it in the response.

---

### `DELETE /api/chatbot/history/{message_id}`

Deletes a single message by ID. Validates ownership.

**Response:** `{ "deleted": true }`

**Errors:**
- `404` if message not found
- `403` if message belongs to another user

---

### `POST /api/chatbot/enhance`

Expands a brief user input into a richer, first-person statement using the LLM + existing knowledge context.

**Request body:** `EnhanceRequest`
```json
{ "content": "I know Python" }
```

**Response:** `EnhanceResponse`
```json
{ "enhanced": "I have three years of hands-on Python experience, primarily building data pipelines..." }
```

**Logic:**
1. Fetch user's existing knowledge chunks (up to 10, for context).
2. Call `enhance_content(brief, user_name, chunks)` → LLM call (temp=0.7, max_tokens=200).
3. Returns expanded first-person statement.

---

### `POST /api/chatbot/upload`

Extracts text from an uploaded file. Accepts multipart form data.

**Supported types:**
- `application/pdf` → `pypdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → `python-docx`
- `text/plain` → UTF-8 decode
- `image/*` (png, jpeg, webp, gif) → Azure OpenAI vision (base64 encode → LLM describe)

**Response:** `UploadResponse`
```json
{ "extracted_text": "John Smith — Software Engineer\n3 years Python, FastAPI, PostgreSQL..." }
```

**Error:** `HTTP 400` for unsupported file type.

---

### `POST /api/chatbot/knowledge`

Manually saves a knowledge chunk (used for testing or explicit saves).

**Request body:** `KnowledgeChunkIn`

```json
{ "content": "I'm fluent in public speaking", "category": "skill" }
```

**Validation:** `category` must be one of `{skill, experience, goal, fear, general}` → `HTTP 400` otherwise.

**Response:** `KnowledgeChunkOut`

---

## 14. Router: Simulate (`routers/simulate_router.py`)

**Prefix:** `/api`  
**Authentication:** Required.

### `POST /api/simulate`

Runs a full life simulation using the user's profile and onboarding data.

**Response:**

```json
{
  "paths": [
    {
      "title": "The Research Path",
      "icon": "🔬",
      "probability": 72,
      "tagline": "Deep work, slow burn, lasting impact",
      "milestones": [
        "Month 6 — First paper accepted",
        "Month 14 — PhD offer from ETH Zurich",
        "Month 24 — Leading a research team"
      ],
      "agent_match": "ARIA"
    },
    { ... },
    { ... }
  ],
  "collective_insight": "72 agents who walked similar paths chose research over startup.",
  "knowledge_count": 8
}
```

**Logic:**
1. Load current user profile.
2. Fetch up to 15 `knowledge_chunks` for the user.
3. Build `user_profile` dict: `{name, focus, goal, fear, bio, skills, score, knowledge}`.
4. Call `simulate_life(user_profile)` → LLM call with `max_tokens=1500`, explicit JSON skeleton in system prompt.
5. Strip markdown fences + `json.loads()` the result.
6. Validate structure: must have `paths` (list of 3) + `collective_insight`.
7. Falls back to a hardcoded 3-path template on any parse or validation error.
8. Returns parsed result + `knowledge_count`.

**LLM prompt:** System prompt includes an explicit JSON skeleton (no markdown fences instruction). User message includes the full profile and all knowledge chunks.

---

## 15. Router: Network (`routers/network_router.py`)

**Prefix:** `/api`

### `GET /api/network/growth?timeframe=`

Returns network growth metrics for the timeline scrubber in `AgenticWebPage.jsx`.

**Query params:**
- `timeframe`: `"past"` | `"this"` | `"all"` (default `"all"`)

**Response:**

```json
{
  "label": "This Month",
  "count": 1763,
  "delta": "+56%",
  "growth": [1129, 1280, 1450, 1620, 1763]
}
```

**Timeframe data:**
| Timeframe | Label | Count | Delta |
|---|---|---|---|
| `past` | Past Month | 554 | +18% |
| `this` | This Month | 1763 | +56% |
| `all` | All Time | 1401 | +∞ |

---

### `GET /api/leaderboard`

Returns the top 12 agents by score.

**Response:**

```json
[
  { "rank": 1, "name": "ARIA", "bio": "...", "icon": "🧠", "score": 9842, "type": 2 },
  ...
]
```

**Logic:**
- Sorts in-memory `AGENTS` list by `score` descending.
- Returns top 12 with `rank` field added (1-indexed).

---

## 16. Router: Achievements (`routers/achievements_router.py`)

**Prefix:** `/api`  
**Authentication:** Required.

### `GET /api/achievements/{user_id}`

Returns the full badge list for a user, with `earned` flags.

**Response:**

```json
[
  {
    "key": "first_node",
    "icon": "★",
    "label": "First Node",
    "desc": "You joined the web",
    "color": "#FFD54F",
    "earned": true
  },
  {
    "key": "seer",
    "icon": "🔮",
    "label": "Seer",
    "desc": "Run your first simulation",
    "color": "#CE93D8",
    "earned": false
  },
  ...
]
```

**All badges:**

| Key | Icon | Label | Color | Earn Condition |
|---|---|---|---|---|
| `first_node` | ★ | First Node | `#FFD54F` | Account exists (always earned) |
| `seer` | 🔮 | Seer | `#CE93D8` | Run 1 simulation |
| `connected` | 🌐 | Connected | `#4FC3F7` | Link to 10 agents |
| `signal` | ⚡ | Signal | `#00D1FF` | Complete Phase 1 |
| `evolution` | 🧬 | Evolution | `#7B61FF` | Run 10 simulations |
| `diamond` | 💎 | Diamond | `#E0E0E0` | Reach score 1000+ |

**Logic:**
- Fetches `badge_key` set from `achievements` table for this user.
- Always adds `first_node` for any existing account.
- Returns all 6 badges with `earned = badge_key in earned_set`.

---

## 17. Service: Agent Seed (`services/agent_seed.py`)

**Location:** [backend-python/services/agent_seed.py](../backend-python/services/agent_seed.py)

The critical determinism module. Builds all 1,401 agents using the same `xorshift32` RNG as the JavaScript frontend so that names, scores, and icons match exactly between Python and JS.

> **CRITICAL:** Never modify the RNG logic without re-validating against the frontend's `agentData.js` output. Validated checkpoints: ARIA=9842, NOX=9120, VEDA=8633.

### xorshift32 RNG

```python
def sr(seed: int) -> float:
    """xorshift32 — mirrors JavaScript implementation bit-for-bit."""
    seed &= 0xFFFFFFFF
    seed ^= (seed << 13) & 0xFFFFFFFF
    seed ^= (seed >> 17) & 0xFFFFFFFF
    seed ^= (seed << 5)  & 0xFFFFFFFF
    return (seed & 0xFFFFFFFF) / 0xFFFFFFFF
```

This produces identical output to the JS `xorshift32(seed)` used in `agentData.js`.

### Notable Agents (Indices 0–29)

30 hand-crafted agents with fixed names, bios, types, and scores:

**Expert tier (type 2):**

| Idx | Name | Role | Score |
|---|---|---|---|
| 0 | ARIA | Career Switch | 9,842 |
| 1 | NOX | Founder | 9,120 |
| 2 | VEDA | Masters Abroad | 8,633 |
| 3 | ORION | Founder | 7,980 |
| 4 | LYRA | Personal Growth | 7,540 |
| 5 | ECHO | Career Switch | 7,190 |
| 6 | DYNA | Exploring Life | 6,870 |
| 7 | FLUX | Founder | 6,540 |
| 8 | KIRA | Masters Abroad | 6,220 |
| 9 | NEXUS | Career Switch | 5,910 |

**Community tier (type 1):**

| Idx | Name | Role | Score |
|---|---|---|---|
| 10 | KAI | Bridge Builder | 4,890 |
| 11 | REX | Problem Solver | 4,430 |
| 12 | MIRA | Mirror Node | 3,980 |
| ... | ... | ... | ... |

**New tier (type 0):**

| Idx | Name | Role | Score |
|---|---|---|---|
| 20–29 | Various | New nodes | 440–1,400 |

### Procedural Agents (Indices 30–1399)

Generated at module import via `_build_agents()`:

- **Name:** `PREFIXES[i % 50] + SUFFIXES[i % 20]` → 1,000 unique combinations.
- **Type:** 1 (Community) by default.
- **Icon:** Picked deterministically from type-specific pools using RNG seeded by `idx`.
- **Bio:** `"Node #X. [Role] in the UniMind web."` where role cycles through Explorer, Builder, Collaborator, Community Node, Connector.
- **Score:** `int(sr(idx * 13 + 7) * 380) + 10` → range 10–390.

### User Agent (Index 1400)

```python
{
    "idx": 1400,
    "name": "YOU",
    "full_name": "YOU",
    "type": 3,
    "icon": "★",
    "bio": "That's you. Welcome to the web.",
    "score": 100,
}
```

### Exported Constant

```python
AGENTS: list[dict]   # 1,401 agent dicts, built once at module import
```

Used directly by `agents_router.py` and `network_router.py`.

---

## 18. Service: Azure OpenAI (`services/azure_openai.py`)

**Location:** [backend-python/services/azure_openai.py](../backend-python/services/azure_openai.py)

Wraps the `AsyncAzureOpenAI` client as a lazy singleton. All LLM calls go through this module.

### Client Initialization

```python
_client: AsyncAzureOpenAI | None = None

def get_client() -> AsyncAzureOpenAI:
    global _client
    if _client is None:
        _client = AsyncAzureOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            azure_endpoint=os.getenv("AZURE_ENDPOINT"),
            api_version=os.getenv("AZURE_API_VERSION", "2024-12-01-preview"),
        )
    return _client
```

### `chat_complete(messages, temperature=0.8, max_tokens=600) -> str`

Standard chat completion call. `max_tokens` is now a parameter (default 600).

```python
async def chat_complete(messages: list[dict], temperature: float = 0.8, max_tokens: int = 600) -> str:
    client = get_client()
    response = await client.chat.completions.create(
        model=os.getenv("DEPLOYMENT_NAME", "gpt-5-chat"),
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content
```

**Temperature conventions:**

| Use case | Temperature | Reason |
|---|---|---|
| Knowledge extraction | 0.2 | Deterministic JSON output needed |
| Regular chat | 0.8 | Natural, varied conversation |
| Life simulation | 0.9 | Creative, vivid narrative output |

### `simulate_life(user_profile) -> str`

Calls the LLM with a structured prompt and returns raw JSON (unparsed — parsing is done in `simulate_router.py`).

**System prompt includes:**
- Role: "UniMind's Collective Intelligence Engine"
- Instruction to return only JSON (no markdown fences)
- Explicit JSON skeleton with field names and types
- Required: `paths` (array of 3), each with `title`, `icon`, `probability`, `tagline`, `milestones` (array of 3), `agent_match`
- Required: `collective_insight` string

**User message includes:**
```
Name: {name}
Focus: {focus}
Goal: {goal}
Fear: {fear}
Bio: {bio}
Skills: {skills}
Score: {score}

Knowledge:
- {chunk_content} [{category}]
- ... (up to 15 chunks)
```

**Token budget:** `max_tokens=1500` (raised from 600 to prevent truncation of the JSON).

---

## 19. Service: Chatbot (`services/chatbot_service.py`)

**Location:** [backend-python/services/chatbot_service.py](../backend-python/services/chatbot_service.py)

Five functions used by `chatbot_router.py`.

### Opening Message

The first assistant message — returned without an LLM call:

```
Welcome to UniMind's knowledge engine. I'm here to build your digital agent profile —
the smarter your profile, the more accurate your life simulations will be.
Let's start simple: what's your name, and what are you most passionate about right now?
```

### `build_system_prompt(name: str, chunks: list[dict]) -> str`

Constructs the system prompt injected at position `[0]` of every chat completion call.

```
You are UniMind's personal knowledge agent — a thoughtful AI interviewer.
Your mission: learn everything meaningful about this user to build their digital agent profile.

Rules:
1. Ask ONE focused question per reply. Keep responses under 100 words.
2. After they share something concrete, acknowledge it and dig one level deeper.
3. Use their name warmly. Be direct and curious, not corporate.
4. After 12-15 exchanges, say 'Your agent profile is ready'...
5. Never repeat a question you already asked.

What you know about {name} so far:
- {chunk_content} [{category}]
- ... (last 10 chunks)
```

If no chunks exist yet: `"none yet"`.

---

### `extract_knowledge(user_message: str) -> dict | None`

Determines whether a user message contains actionable knowledge worth saving.

**LLM call:** temperature 0.2, max_tokens 150.

**Prompt asks LLM to return JSON:**
```json
{
  "should_save": true,
  "category": "skill",
  "content": "Has 3 years of Python experience"
}
```

**Parsing:**
- Strips markdown fences (` ```json ... ``` `).
- `json.loads()` the result.
- Returns `None` on any parse or LLM error (non-blocking).

**Valid categories:** `skill`, `experience`, `goal`, `fear`, `general`

---

### `build_agent_bio(name: str, chunks: list[dict]) -> str`

Generates a 2-sentence agent bio from accumulated knowledge chunks.

**LLM call:** temperature 0.7, max_tokens 120.

**Prompt:** Provides first 12 chunks + style instruction: "cosmic, data-driven, confident."

**Fallback:** Returns `"{name} is exploring new paths in the UniMind web."` if LLM call fails.

**Example output:**
```
Jane is a Python-fluent developer pivoting into AI, driven by a vision 
to build tools that expand human potential.
```

---

### `enhance_content(brief: str, user_name: str, chunks: list[dict]) -> str`

Expands a short user message into a richer first-person statement.

**LLM call:** temperature 0.7, max_tokens 200.

**Prompt:** Provides the brief input + user name + up to 10 existing knowledge chunks as context. Instructs LLM to write 2–4 sentences in first person, past tense where applicable, specific details.

**Returns:** Expanded statement string. Falls back to the original brief on error.

---

### `extract_text_from_file(data: bytes, content_type: str, filename: str) -> str`

Extracts text from uploaded file bytes.

| Content-type | Method |
|---|---|
| `application/pdf` | `pypdf.PdfReader` — extracts all page text |
| `.docx` | `python-docx Document` — concatenates all paragraph text |
| `text/plain` | `data.decode('utf-8')` |
| `image/*` | Base64 encode → Azure OpenAI vision call ("describe all text in this image") |

**Returns:** Extracted text string (may be empty for blank documents).

---

## 20. Seed Data (`seed_data/`)

### `seed_data/posts_seed.py`

Defines `SEED_POSTS`: a list of 10 dicts exactly matching the frontend's `INITIAL_POSTS` array.

**Each post dict:**
```python
{
    "id": "seed-1",
    "agent_name": "ARIA",
    "agent_icon": "🔮",
    "agent_type": 2,
    "agent_score": 9842,
    "content": "Just completed my 847th life simulation...",
    "tag": "Simulation",
    "user_id": None,
    "created_at": "...",   # Computed as datetime.utcnow() - timedelta(minutes=N)
    "reactions": {
        "⚡": 142,
        "✨": 89,
        "🔬": 34,
    }
}
```

**Agents used in seed posts:** ARIA, NOX, VEDA, LUME, ECHO, ORION, FAR, LYRA, DYNA, KALI.

---

### `seed_data/run_seed.py`

One-time initialization script. Safe to re-run (uses `INSERT OR IGNORE`).

```bash
python seed_data/run_seed.py
```

**Steps:**
1. `load_dotenv()` to read `DB_PATH`.
2. `asyncio.run(main())`:
   - Opens aiosqlite connection.
   - Executes `CREATE_TABLES_SQL` from `db.py`.
   - Iterates `SEED_POSTS`, inserts each post + its reactions.
3. Prints: `"Seeded 10 posts. Database ready."`

---

## 21. Data Flow Diagrams

### Auth Flow

```
Client                          Backend
  │                               │
  │── POST /api/auth/signup ──────►│
  │                               │ hash_password()
  │                               │ INSERT INTO users
  │                               │ create_access_token()
  │◄─── TokenResponse ────────────│
  │  {access_token, user_id, name}│
  │                               │
  │ Store token in localStorage   │
  │                               │
  │── GET /api/users/me ──────────►│
  │  Authorization: Bearer <token>│
  │                               │ get_current_user()
  │                               │ SELECT * FROM users
  │◄─── UserProfile ──────────────│
```

### Chat + Knowledge Extraction Flow

```
Client                      Backend                      Azure OpenAI
  │                            │                              │
  │── POST /chatbot/message ──►│                              │
  │   {content: "..."}         │                              │
  │                            │── chat_complete() ──────────►│
  │                            │   [system_prompt, ...history]│
  │                            │◄── assistant reply ──────────│
  │                            │                              │
  │                            │── extract_knowledge() ──────►│
  │                            │   (user message only)        │
  │                            │◄── {should_save, category}──│
  │                            │                              │
  │                            │ INSERT knowledge_chunks      │
  │                            │── build_agent_bio() ────────►│
  │                            │◄── new bio string ───────────│
  │                            │ UPDATE users bio+skills      │
  │                            │                              │
  │◄── ChatResponse ───────────│
  │  {message, profile_update} │
```

### Post + Reaction Flow

```
Client                          Backend
  │                               │
  │── POST /api/posts ────────────►│
  │   {text, tag}                 │ INSERT posts (agent_name=USER.name, type=3)
  │                               │ INSERT reactions ×3 (⚡✨💫, count=0)
  │◄── PostOut ───────────────────│
  │                               │
  │── POST /api/posts/{id}/react ─►│
  │   {emoji: "⚡"}               │ INSERT OR UPDATE reactions.count+1
  │◄── {emoji, count} ────────────│
```

---

## 22. Security Model

### JWT

- Algorithm: `HS256`
- Expiry: 7 days
- Payload: `{sub: user_id, name: user_name, exp: timestamp}`
- Secret: `JWT_SECRET` env var (never hardcoded)

### Password Storage

- `passlib[bcrypt]` with `bcrypt==4.0.1` (pinned for compatibility)
- Passwords are salted and hashed — never stored in plaintext
- Verification via `passlib.context.verify(plain, hash)`

### SQL Injection Prevention

- All queries use parameterized placeholders (`?`)
- No string interpolation in SQL
- Example: `await db.execute("SELECT * FROM users WHERE email = ?", (email,))`

### CORS

- Restricted to `http://localhost:5173` (Vite dev server)
- `allow_credentials=True` for cookie-based auth if needed in future

### Input Validation

- Pydantic v2 validates all request bodies before reaching route handlers
- `knowledge` category is validated against allowlist: `{skill, experience, goal, fear, general}`
- Email uniqueness enforced at DB level (UNIQUE constraint)

### Secrets

- `.env` is in `.gitignore`
- Azure API key never appears in responses, logs, or frontend code
- JWT secret never logged

---

## 23. Key Architecture Patterns

### 1. Async Throughout

All routes are `async def`. Database calls use `aiosqlite`. LLM calls use `AsyncAzureOpenAI`. No blocking I/O anywhere in the request path.

### 2. Dependency Injection

Two core FastAPI dependencies used across routes:

```python
db = Depends(get_db)                          # Open DB connection
current_user = Depends(get_current_user)      # Authenticated user dict
```

`get_db()` uses `async with aiosqlite.connect(...)` internally — **never** re-wrap `db` in `async with`.

### 3. In-Memory Agent Store

All 1,401 agents live in the `AGENTS` list in memory (built once at module import). This avoids a `SELECT * FROM agents` on every request and keeps agent data fast and deterministic.

### 4. Non-Blocking Knowledge Extraction

Knowledge extraction runs after the assistant reply is ready. If it fails, the user still gets their chat response — the `profile_update` field is just `None`.

### 5. Relative Timestamps

Posts are stored as ISO 8601 UTC strings. The `GET /api/posts` route computes "2m ago" / "1h ago" / "3d ago" at read time rather than storing them.

### 6. xorshift32 Parity

The Python `sr()` function in `agent_seed.py` exactly mirrors the JavaScript `xorshift32()` in `agentData.js`. This ensures that agent index 0 always maps to ARIA with score 9842 in both environments.

---

## 24. Frontend Integration Reference

This table maps every API endpoint to the frontend file and function that calls it.

| Endpoint | HTTP | Frontend Location | api.js Function |
|---|---|---|---|
| `/api/auth/signup` | POST | `SignupPage.jsx` (bypassed) | `signup()` |
| `/api/auth/login` | POST | `LoginPage.jsx` (bypassed) | `login()` |
| `/api/users/me` | GET | `App.jsx` (session restore) / `CommunityPage ProfileCard` | `getMe()` |
| `/api/users/me/onboarding` | POST | `App.jsx → handleEnter()` | `saveOnboarding()` |
| `/api/agents` | GET | `AgenticWebPage.jsx` | `getAgents()` |
| `/api/agents/search?q=` | GET | `AgenticWebPage.jsx → SearchBar` | `searchAgents(q)` |
| `/api/posts` | GET | `CommunityPage.jsx` (mount) | `getPosts()` |
| `/api/posts/trending` | GET | `CommunityPage.jsx → TrendingSection` | `getTrendingTags()` |
| `/api/posts` | POST | `CommunityPage.jsx → PostComposer` | `createPost()` |
| `/api/posts/{id}/react` | POST | `CommunityPage.jsx → PostCard` | `reactToPost()` |
| `/api/chatbot/message` | POST | `ChatbotPage.jsx → sendMessage()` | `sendChatMessage()` |
| `/api/chatbot/history` | GET | `ChatbotPage.jsx` (mount) | `getChatHistory()` |
| `/api/chatbot/history` | DELETE | `ChatbotPage.jsx → clearHistory()` | `clearChatHistory()` |
| `/api/chatbot/history/{id}` | DELETE | `ChatbotPage.jsx → MessageBubble ×` | `deleteChatMessage(id)` |
| `/api/chatbot/enhance` | POST | `ChatbotPage.jsx → ✦ button` | `enhanceContent(content)` |
| `/api/chatbot/upload` | POST | `ChatbotPage.jsx → 📎 button` | `uploadFile(file)` |
| `/api/chatbot/knowledge` | POST | `ChatbotPage.jsx` (manual save) | `saveKnowledge()` |
| `/api/simulate` | POST | `AgenticWebPage.jsx → Core click` | `runSimulate()` |
| `/api/network/growth` | GET | `AgenticWebPage.jsx → GrowthTimeline` | `getNetworkGrowth()` |
| `/api/leaderboard` | GET | `AgenticWebPage.jsx → LeaderboardModal` / `CommunityPage → FeaturedStoriesBar` | `getLeaderboard()` |
| `/api/achievements/{id}` | GET | `CommunityPage.jsx → ProfileCard` | `getAchievements()` |

> All frontend API calls go through `frontend-react/src/lib/api.js`. Never use `fetch()` directly in page components.

---

*This document covers the complete backend as of May 2026. All 22 endpoints are implemented and tested. The Azure OpenAI integration (chatbot + simulation + enhance + file vision) requires a valid `.env` with `OPENAI_API_KEY` and `AZURE_ENDPOINT`.*
