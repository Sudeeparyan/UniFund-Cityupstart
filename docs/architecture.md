# UniMind Architecture

## System Overview

```
Browser (localhost:5173)
    │
    │  fetch() via api.js with JWT Bearer token
    │
FastAPI Backend (localhost:8000)
    │
    ├── SQLite (unimind.db)
    │       users, posts, reactions, chat_messages, knowledge_chunks, achievements
    │
    └── Azure OpenAI (gpt-5-chat)
            chatbot conversation, knowledge extraction, life simulation, file vision
```

---

## Folder Structure

```
unimind-react/           ← git root
├── frontend-react/      ← React 18 + Vite + Three.js + Framer Motion
│   └── src/
│       ├── App.jsx              ← Router (onboarding → agentic → timeline/community/runway)
│       ├── lib/
│       │   ├── api.js           ← ALL API calls, JWT from localStorage
│       │   ├── scene.js         ← Three.js particle morphing (Onboarding)
│       │   ├── scene2.js        ← Three.js network graph (Agentic Web)
│       │   └── agentData.js     ← 1,401 agent defs + BFS pathfinding
│       └── pages/
│           ├── LoginPage.jsx       ← Auth (currently bypassed)
│           ├── SignupPage.jsx      ← Auth (currently bypassed)
│           ├── ChatbotPage.jsx     ← Knowledge dump, file upload, content enhancer
│           ├── OnboardingPage.jsx  ← Chat-style 3-question form + 3D particles
│           ├── AgenticWebPage.jsx  ← 3D network + simulation trigger
│           ├── TimelinePage.jsx    ← 3 life path cards + context quality banner
│           ├── CommunityPage.jsx   ← Social feed, real API data
│           └── RunwayPage.jsx      ← Developer financial runway tracker
├── backend-python/      ← FastAPI + SQLite + Azure OpenAI
│   ├── main.py          ← App factory, CORS, router mounts
│   ├── db.py            ← SQLite schema + async helpers
│   ├── auth.py          ← JWT + bcrypt
│   ├── models/          ← Pydantic request/response models
│   ├── routers/         ← One file per resource
│   ├── services/
│   │   ├── agent_seed.py     ← Python port of xorshift32, builds 1,401 agents at startup
│   │   ├── azure_openai.py   ← AsyncAzureOpenAI singleton
│   │   └── chatbot_service.py ← Conversation + extraction + enhance + file-OCR logic
│   └── seed_data/       ← DB initialization + seed posts
└── docs/                ← This folder
```

---

## Page Routing (App.jsx)

```
Start → onboarding (auth bypassed)
  │
  └─► (after Enter) ──► agentic
                            │
                ┌───────────┼──────────────┐
                ▼           ▼              ▼
           community     timeline        runway
               │              │
           (back)          (back or chatbot)
```

**Auth pages exist** (`LoginPage`, `SignupPage`) but are currently commented out in `App.jsx`. The app starts directly at `OnboardingPage`. Authentication state is maintained in `authUser` + `localStorage` for future re-enabling.

**Lazy loading:** All pages except `LoginPage` and `SignupPage` are loaded via `React.lazy()` with a `<Suspense>` spinner to reduce initial bundle size.

---

## Auth Flow (available but currently bypassed)

```
Signup → POST /api/auth/signup → JWT token → localStorage
Login  → POST /api/auth/login  → JWT token → localStorage

On app load (when auth enabled):
  token in localStorage → GET /api/users/me (verify) → restore session
  no token → show LoginPage
```

---

## Chatbot Knowledge Pipeline

```
User types / uploads file / uses Enhance
  │
  │── (file) POST /api/chatbot/upload ──► extract_text_from_file()
  │        PDF(pypdf) | DOCX(python-docx) | TXT | image(vision API)
  │
  │── (enhance) POST /api/chatbot/enhance ──► LLM expands brief → rich statement
  │
  └── POST /api/chatbot/message
          → LLM call 1: Generate assistant reply (full conversation history)
          → LLM call 2: Extract knowledge chunk from user message
          → If knowledge extracted: save to knowledge_chunks table
          → Rebuild agent_bio from all chunks
          → Update users table (agent_bio, agent_skills)
      → Response includes: message (with id) + profile_update
          → Frontend updates left panel (bio, skills, progress bar) live
```

---

## Simulation Pipeline

```
AgenticWebPage: user clicks UniMind Core
  → runSimulate() called concurrently with 5s visual animation
  → POST /api/simulate
      → Fetch user profile + up to 15 knowledge_chunks
      → simulate_life(user_profile, knowledge) → LLM call (max_tokens=1500)
      → Parse structured JSON: 3 life paths + collective_insight
      → Falls back to hardcoded template on malformed JSON
  → Response stored in App.simulationData + simulationKnowledgeCount
  → "Continue to Timeline →" navigates to TimelinePage with data
```

---

## Agent Data

1,401 agents are generated in Python at startup using a port of the frontend's `xorshift32` RNG.
The RNG seed and formula are identical, ensuring agent names and scores match what the Three.js
scene displays in the browser. Agents are served from an in-memory list — no DB required.

**Validated checkpoints:** ARIA=9842, NOX=9120, VEDA=8633.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Three.js 0.128, Framer Motion 10, Tailwind CSS 3 |
| Backend | FastAPI 0.111, uvicorn 0.29, aiosqlite 0.20 |
| Auth | JWT (python-jose), bcrypt (passlib 1.7.4 + bcrypt 4.0.1) |
| AI | Azure OpenAI (AsyncAzureOpenAI, gpt-5-chat) |
| File parsing | pypdf 4.3.1, python-docx 1.1.2, pillow 10.4.0 |
| Database | SQLite (file: unimind.db) |
| Dev ports | Frontend: 5173, Backend: 8000 |
