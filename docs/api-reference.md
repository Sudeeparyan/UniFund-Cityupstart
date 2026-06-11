# UniMind API Reference

Base URL: `http://localhost:8000`

All protected routes require: `Authorization: Bearer <token>`

---

## Auth

### POST /api/auth/signup
Create a new user account.
```json
{ "email": "you@example.com", "password": "secret123", "name": "Sudeep" }
```
Response: `{ "access_token": "...", "token_type": "bearer", "user_id": "...", "name": "Sudeep" }`

### POST /api/auth/login
```json
{ "email": "you@example.com", "password": "secret123" }
```
Response: same as signup

---

## Users

### GET /api/users/me *(protected)*
Returns current user's full profile including `agent_bio`, `agent_skills`, `agent_score`, `posts_count`, and onboarding answers.

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
  "posts_count": 4
}
```

> `posts_count` is computed at query time via a COUNT on the `posts` table.

### POST /api/users/me/onboarding *(protected)*
```json
{
  "focus": { "choice": "Student", "custom": "" },
  "goal":  { "choice": "Masters Abroad", "custom": "" },
  "fear":  { "choice": "Failure", "custom": "" }
}
```
Response: Updated `UserProfile` with `onboarding_complete: true`.

---

## Agents

### GET /api/agents?page=1&size=100
Paginated list of all 1,401 agents from the in-memory seed.

### GET /api/agents/search?q=ARIA
Case-insensitive substring search by name. Returns up to 20 results.

---

## Posts

### GET /api/posts
Returns 50 most recent posts, newest first. Each post includes its reactions.

### GET /api/posts/trending
Returns the top 6 tags by post count. No auth required.

```json
[
  { "tag": "Simulation", "count": 14 },
  { "tag": "Insight", "count": 9 },
  ...
]
```

> **Route order:** This route is registered before `POST /api/posts` in the router to avoid FastAPI treating `trending` as a post ID.

### POST /api/posts *(protected)*
```json
{ "text": "My post content", "tag": "Insight" }
```
Response: `PostOut` with reactions initialized to 0.

### POST /api/posts/{id}/react *(protected)*
```json
{ "emoji": "⚡" }
```
Response: `{ "emoji": "⚡", "count": 143 }`

---

## Simulation

### POST /api/simulate *(protected)*
Uses the current user's profile + onboarding answers + up to 15 knowledge chunks to generate a structured life simulation via Azure OpenAI.

Response:
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
  "collective_insight": "72 agents who walked similar paths chose research over startup. The data suggests patience pays off.",
  "knowledge_count": 8
}
```

Falls back to a hardcoded 3-path template if LLM returns malformed JSON. `knowledge_count` reflects how many of the user's knowledge chunks were included in the prompt.

---

## Network

### GET /api/leaderboard
Top 12 agents by score. Returns `rank`, `name`, `bio`, `icon`, `score`, `type`.

### GET /api/network/growth?timeframe=this
Timeframe: `past` | `this` | `all`. Returns growth sparkline data.

```json
{
  "label": "This Month",
  "count": 1763,
  "delta": "+56%",
  "growth": [1129, 1280, 1450, 1620, 1763]
}
```

---

## Achievements

### GET /api/achievements/{user_id} *(protected)*
Returns 6 badges with `earned: true/false`.

| Key | Icon | Label | Earn Condition |
|---|---|---|---|
| `first_node` | ★ | First Node | Account exists |
| `seer` | 🔮 | Seer | Run 1 simulation |
| `connected` | 🌐 | Connected | Link to 10 agents |
| `signal` | ⚡ | Signal | Complete Phase 1 |
| `evolution` | 🧬 | Evolution | Run 10 simulations |
| `diamond` | 💎 | Diamond | Reach score 1000+ |

---

## Chatbot

### POST /api/chatbot/message *(protected)*
```json
{ "content": "I'm a computer science student focused on AI..." }
```
Response:
```json
{
  "message": {
    "id": "abc-123",
    "role": "assistant",
    "content": "...",
    "created_at": "2026-05-19T10:30:00.000Z"
  },
  "profile_update": { "bio": "...", "skills": ["..."], "chunks_saved": 3 }
}
```

First call (no history) returns the opening message instantly (no LLM call). All messages include an `id` field used for per-message deletion.

### GET /api/chatbot/history *(protected)*
Full conversation history for the current user, ordered oldest-first.
Response: `list[ChatMessageOut]` — each item includes `id`, `role`, `content`, `created_at`.

### DELETE /api/chatbot/history *(protected)*
Clears all chat messages for the current user and re-seeds the opening message.
Response: `{ "cleared": <count>, "opening_message": { ...ChatMessageOut } }`

### DELETE /api/chatbot/history/{message_id} *(protected)*
Deletes a single message by ID. Validates that the message belongs to the current user.
Response: `{ "deleted": true }`
Errors: `404` if not found, `403` if message belongs to another user.

### POST /api/chatbot/enhance *(protected)*
Expands a brief user input into a richer first-person statement using the LLM + the user's existing knowledge context.

Request:
```json
{ "content": "I know Python" }
```
Response:
```json
{
  "enhanced": "I have three years of hands-on Python experience, primarily in building data pipelines and automation scripts, and I'm now applying that foundation to machine learning projects."
}
```

### POST /api/chatbot/upload *(protected)*
Multipart file upload. Extracts text from PDF, DOCX, TXT, or image files.

Request: `multipart/form-data` with `file` field.

Supported types:
- `application/pdf` — extracted via `pypdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` — extracted via `python-docx`
- `text/plain` — UTF-8 decoded
- `image/png`, `image/jpeg`, `image/webp`, `image/gif` — described via Azure OpenAI vision (base64)

Response:
```json
{ "extracted_text": "..." }
```

### POST /api/chatbot/knowledge *(protected)*
Manually save a knowledge chunk.
```json
{ "content": "Expert in Python machine learning", "category": "skill" }
```
Category options: `skill` | `experience` | `goal` | `fear` | `general`
