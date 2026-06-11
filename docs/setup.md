# UniMind — Local Setup Guide

## Prerequisites
- Python 3.11+
- Node.js 18+

---

## 1. Backend Setup

```bash
cd backend-python

# Install dependencies
pip install -r requirements.txt

# Seed the database (run once)
python seed_data/run_seed.py

# Start the server
python -m uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
API docs (Swagger): **http://localhost:8000/docs**

---

## 2. Frontend Setup

```bash
cd frontend-react

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 3. First Time Flow

> **Note:** Authentication is currently bypassed. The app starts directly at the Onboarding page. The login/signup pages exist in `pages/` but are commented out in `App.jsx`.

1. Open http://localhost:5173 — lands on **OnboardingPage** (chat-style questionnaire)
2. Answer the 3 adaptive questions → click "Enter the Agentic Web →"
3. Explore the **Agentic Web** (3D network) → click the glowing UniMind Core → run your life simulation
4. Click "Continue to Your Timeline →" to see **TimelinePage** (3 life path cards)
5. Use "Enrich Your Agent" in the timeline to open **ChatbotPage** and add knowledge
6. Navigate to **Community** → post and interact with the feed
7. Navigate to **Runway** → track developer financial runway (from AgenticWebPage)

---

## 4. Environment Variables

The backend reads from `backend-python/.env`. Copy `.env.example` and fill in:

```env
OPENAI_API_KEY=your_azure_openai_key_here
AZURE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_API_VERSION=2024-12-01-preview
DEPLOYMENT_NAME=gpt-5-chat
JWT_SECRET=random-64-char-string-for-production
DB_PATH=./unimind.db
```

| Variable | Required | Default |
|---|---|---|
| `OPENAI_API_KEY` | Yes | — |
| `AZURE_ENDPOINT` | Yes | — |
| `AZURE_API_VERSION` | No | `2024-12-01-preview` |
| `DEPLOYMENT_NAME` | No | `gpt-5-chat` |
| `JWT_SECRET` | Yes | `dev-secret-change-me` |
| `DB_PATH` | No | `./unimind.db` |

---

## 5. Re-enabling Authentication

Auth is preserved but disabled. To re-enable:

1. In `frontend-react/src/App.jsx`, uncomment the `login` and `signup` page blocks inside `<AnimatePresence>`
2. Change the initial state from `'onboarding'` to `'login'`
3. Uncomment the `useEffect` that calls `getMe()` on mount for session restore

The `LoginPage.jsx`, `SignupPage.jsx`, `handleLoginSuccess()`, `handleSignupSuccess()` functions, and all backend auth endpoints are fully implemented and ready.
