# UniMind — Gap Analysis (Updated May 2026)

This document tracks what the original `idea.md` vision describes versus what is actually built, and what remains to be done.

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
| Agents communicate and learn from each other | Not built (requires knowledge graph layer) |
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
| Re-enable authentication | Login/Signup pages exist and are built — just uncomment in App.jsx |

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
| Runway page backend sync | RunwayPage is entirely client-side |
| Node search by bio content | Currently searches by name only |

---

## Summary

The platform is **fully functional end-to-end** for the core loop:
- Onboarding (adaptive chat-style) ✅
- Chatbot knowledge interview (with file upload + enhancer) ✅
- 3D network exploration ✅
- LLM life simulation with 3 structured paths ✅
- Community feed (real API) ✅
- Developer runway tracker ✅

The biggest remaining gaps from the original vision are the **full node journey view** (clicking a node → their story) and **real agents in the 3D scene** (still procedural). The cinematic 3D timeline from idea.md has been functionally replaced by TimelinePage (card-based, but real LLM output).
