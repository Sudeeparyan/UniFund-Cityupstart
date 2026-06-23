# UniMind / UniFund — Local Setup Guide

## Prerequisites
- Python 3.11+
- Node.js 18+

---

## 1. Backend Setup

```bash
cd backend-python

# Install dependencies
pip install -r requirements.txt

# Create your .env (see section 4) — required for the AI features
cp .env.example .env   # then fill in OPENAI_API_KEY etc.

# Seed the database (run once): creates tables, seed posts, and demo user "Ramya"
python seed_data/run_seed.py

# Start the server
python -m uvicorn main:app --reload --port 8000
```

Backend: **http://localhost:8000** · Swagger: **http://localhost:8000/docs**

> Tables are also auto-created on server startup (`create_tables()` in the lifespan). `run_seed.py` is what inserts the seed posts and the Ramya runway demo data.

---

## 2. Frontend Setup

```bash
cd frontend-react

npm install
npm run dev
```

Frontend: **http://localhost:5173** (CORS allows any localhost/127.0.0.1 port).

---

## 3. First-Time Flow

> **No login required.** On load the app silently obtains a **guest token** (`POST /api/auth/guest`, stored as `unifund_token`). All API calls work as the shared guest account out of the box.

1. Open http://localhost:5173 → **Onboarding** (chat-style questionnaire).
2. Answer the 3 questions → "Enter" → cinematic transition to the **Agentic Web** (the "Web" tab).
3. Click the glowing Core → runs your life simulation → "Continue to Your Timeline →" → **Timeline** (3 life paths).
4. Bottom nav: **Runway · Web · Agent · Community**.
   - **Agent** → Agent Studio: connect MCP tools to level up your agent, chat, or paste a job description to run the résumé pipeline.
   - **Runway** → personal-finance tracker (AI savings plan + per-transaction tips call the backend).
   - **Community** → post and react on the live feed.

### Developer control plane
Open **http://localhost:5173/developer** → terminal login. Default credentials:
```
admin@unimind.dev / unimind-dev-2025
team@unimind.dev  / unimind-dev-2025
```
Stores a separate `unifund_dev_token` and shows LLM telemetry, the onboarding funnel, user management, simulation/community health, and the three LLM quality-eval pipelines.

### Demo accounts (optional, created by the seed)
- **Ramya** — `ramya@unimind.dev` / `ramya2025` (id `ramya-seed-001`), pre-loaded with full Runway data. (Email/password login pages aren't wired into the app UI, but `/api/auth/login` works directly.)

---

## 4. Environment Variables

The backend reads `backend-python/.env`. Copy `.env.example` and fill in:

```env
OPENAI_API_KEY=your_azure_openai_key_here
AZURE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_API_VERSION=2024-12-01-preview
DEPLOYMENT_NAME=gpt-5-chat
JWT_SECRET=random-64-char-string-for-production
DB_PATH=./unifund.db
```

| Variable | Required | Default (code) |
|---|---|---|
| `OPENAI_API_KEY` | Yes (for AI features) | — |
| `AZURE_ENDPOINT` | Yes (for AI features) | `""` |
| `AZURE_API_VERSION` | No | `2024-12-01-preview` |
| `DEPLOYMENT_NAME` | No | `gpt-5-chat` |
| `JWT_SECRET` | Recommended | `fallback_secret_change_me` |
| `DB_PATH` | No | `./unimind.db` (the example sets `./unifund.db`) |
| `DEV_EMAIL_1` / `DEV_EMAIL_2` / `DEV_PASS` | No | `admin@unimind.dev` / `team@unimind.dev` / `unimind-dev-2025` |

> **Pick one DB file and stick to it.** The code default (no `DB_PATH`) is `unimind.db`; `.env.example` overrides to `unifund.db`. Make sure `run_seed.py` and the running server resolve the same `DB_PATH`, or the server will see an empty (auto-created) database.

Without a valid Azure key the app still runs — guest auth, posts, the 3D scenes, and onboarding all work — but every LLM-backed feature (chatbot, simulation, enhance, file vision, runway plan/tips, agent studio, eval pipelines) falls back to canned/deterministic output.

---

## 5. Notes on Authentication

- The app is **guest-first**; there is no login screen in the main flow. `src/lib/api.js` mints a fresh guest token and retries once whenever a request returns `401`.
- The full email/password pages (`LoginPage`, `SignupPage`, `SignInPage`) exist in `src/pages/` but are not routed in `App.jsx`. The backend `POST /api/auth/signup` and `/api/auth/login` endpoints are fully functional if you want to wire them back in.
- The developer plane uses a **separate** token (`unifund_dev_token`) and the `/api/dev/auth` endpoint.
