# UniMind / UniFund — Gap Analysis (Updated June 2026)

This document tracks what the original `idea.md` vision describes versus what is actually built, and what remains to be done.

> Since the May 2026 pass the platform also gained: **Agent Studio** (MCP-tool-driven agent levels + résumé pipeline), a full **Developer control plane**, three **LLM quality-eval pipelines**, a **guest-first auth** model, and a **backend-backed Runway** (AI savings plan + tips). See the "Newly built" section at the bottom.

---

## What's Built vs. What the Idea Describes

### Surface 1 — Onboarding

| Idea | Status |
|---|---|
| Not a signup form, but a real dialogue | ✅ Chat-style bubble UI (adaptive Q2 based on Q1) |
| AI asks follow-up questions dynamically | Partial — Q2 adapts based on Q1, but no LLM per question |
| Output: living agent model (personality fingerprint, risk profile) | Partial — backend saves focus/goal/fear + builds bio from chatbot |
| 3D particle morphing: dust → molecule → DNA → brain | ✅ Built and working |
| Chatbot knowledge interview before onboarding | ✅ ChatbotPage with file upload + content enhancer |

**Gap:** Q2 adaptive branching is rule-based, not LLM-driven. A `/api/onboarding/chat` endpoint for true LLM-per-question is not yet built.

---

### Surface 2 — Simulation Studio / Timeline

| Idea | Status |
|---|---|
| Cinematic month-by-month prediction | ✅ 3 life path cards with milestones on TimelinePage |
| 3D timeline unfolding through space | Not built |
| Ghost trails of similar journeys | Not built |
| Risk moments pulse red | Not built (milestones are text-only) |
| Decision forks branch the path | Not built (3 paths shown but no interactive branching) |
| Explore alternate timelines by changing decisions | Not built |
| Inward scan + Outward scan + Synthesis | ✅ Simulated via 4-phase animation + LLM output |
| Real LLM-generated personalised paths | ✅ Azure OpenAI generates 3 structured paths + collective insight |
| Context quality signal | ✅ ContextQualityBanner shows signal strength from knowledge chunks |

**Gap:** The cinematic 3D timeline (the "jaw-drop centerpiece" from idea.md) is replaced by a card-based view. Functional and personalized, but not a 3D month-by-month animation.

---

### Surface 3 — Agentic Web

| Idea | Status |
|---|---|
| 3D spider web of agents | ✅ 1,401 nodes in WebGL |
| BFS pathfinding | ✅ Built |
| Timeline scrubber (network growth over time) | ✅ Built |
| Leaderboard | ✅ API-backed, top 12 |
| Filters (Expert / Community / New / You) | ✅ Built |
| Click node → full journey view | Not built (tooltip only) |
| Agents communicate and learn from each other | Partial — visual A2A only (Agent Studio "Space Arena" + Community A2A badges); no real knowledge-graph exchange |
| Real user agents injected into 3D scene | Not built (still procedural seed data) |

---

### Surface 4 — Community

| Idea | Status |
|---|---|
| Real agent posts from DB | ✅ GET /api/posts |
| Post creation with tags | ✅ POST /api/posts |
| Reactions | ✅ API-backed fire-and-forget |
| Trending tags | ✅ GET /api/posts/trending with bar chart |
| Live activity feed | Partial — client-side setInterval (no WebSocket) |
| Leaderboard / Featured Stories | ✅ FeaturedStoriesBar from API leaderboard |
| User profile with real stats | ✅ Real score, real posts_count, real badges |

---

## What's Still Missing (Ranked by Impact)

### High Impact — Requires Backend Work

| Feature | Why it Matters |
|---|---|
| Full node journey view | Clicking an agent node should open their story, not just a tooltip. Core to idea.md's vision. |
| Real agent profiles in 3D scene | Real user agents injected into Three.js alongside procedural ones |
| Agent-to-agent knowledge exchange | The knowledge graph layer — agents learn from each other |
| LLM-driven onboarding | `/api/onboarding/chat` endpoint for truly dynamic questions |
| Real (non-guest) auth in the UI | App is now guest-first (`/api/auth/guest`); the built Login/Signup pages exist but aren't routed in App.jsx. Wiring them in + per-user data isolation (guest is a single shared account) is the remaining work. |

### Medium Impact — Frontend Only

| Feature | Notes |
|---|---|
| 3D timeline animation | Month-by-month cinematic view described in idea.md. TimelinePage is card-based, not 3D. |
| Interactive path branching | Change decisions → see different timeline |
| WebSocket live activity | Replace setInterval in CommunityPage with real-time feed |
| Agent score evolution | User's agent_score doesn't update dynamically in the UI |

### Low Impact — Polish

| Feature | Notes |
|---|---|
| Reply threads on posts | "reply ↗" is a placeholder |
| Full Runway backend sync | AI savings plan + per-transaction tips now call the backend; the income/category/transaction/account CRUD endpoints exist and are seeded (Ramya) but the page UI still drives most state locally |
| Node search by bio content | `/api/agents/search` now matches name **or** full_name; bio-content search still not built |

---

## Newly Built Since May 2026 (beyond the original idea.md scope)

| Feature | Status |
|---|---|
| **Agent Studio** (the "Agent" tab) | ✅ MCP-tool-driven level system (BABY→MAX), résumé-tailoring pipeline (`/api/studio/run`), right-side "Space Arena" agent simulation |
| **Developer control plane** (`/developer`) | ✅ Separate dev auth + ~30 `/api/dev/*` endpoints: LLM telemetry, onboarding funnel, user management, simulation/community health, feature flags, broadcast |
| **LLM quality-eval pipelines** | ✅ 3 background evaluators — chunk quality, simulation personalisation/groundedness, enhancement hallucination guard — surfaced in the dev plane |
| **Runway backend** | ✅ `runway_*` tables + CRUD + AI savings plan + per-transaction tips; demo user "Ramya" seeded |
| **Guest-first auth** | ✅ `/api/auth/guest` + auto-token-refresh on 401 (replaced the bypassed-login model) |
| **Telemetry on every LLM call** | ✅ `llm_logs` / `simulation_logs` record tokens, latency, fallback status |

---

## Summary

The platform is **fully functional end-to-end** for the core loop and several adjacent surfaces:
- Onboarding (adaptive chat-style) ✅
- Knowledge interview / Agent Studio (file upload + enhancer + level system + résumé pipeline) ✅
- 3D network exploration ✅
- LLM life simulation with 3 structured paths ✅
- Community feed (real API) ✅
- Runway finance tracker (AI plan + tips) ✅
- Developer control plane + LLM quality evals ✅

The biggest remaining gaps from the original vision are the **full node journey view** (clicking a node → their story), **real agents in the 3D scene** (still procedural), **true LLM-driven onboarding**, and **per-user data isolation** (the app currently runs on a shared guest account). The cinematic 3D timeline from idea.md remains functionally replaced by the card-based TimelinePage (real LLM output).
