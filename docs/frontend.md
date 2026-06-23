# UniMind / UniFund React — Frontend Documentation

> Reference for the frontend codebase. The product is mid-rebrand UniMind → UniFund; the user token lives in `localStorage.unifund_token`, the dev token in `localStorage.unifund_dev_token`.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [File Structure](#3-file-structure)
4. [API Layer (`api.js`)](#4-api-layer-apijs)
5. [App Router (`App.jsx`)](#5-app-router-appjsx)
6. [Page: Onboarding](#6-page-onboarding)
7. [Page: Agentic Web](#7-page-agentic-web)
8. [Page: Timeline](#8-page-timeline)
9. [Page: Community](#9-page-community)
10. [Page: Runway](#10-page-runway)
11. [Page: Agent Studio (the "Agent" tab)](#11-page-agent-studio-the-agent-tab)
12. [Developer Plane (Login + Control Plane)](#12-developer-plane-login--control-plane)
13. [Shared Components](#13-shared-components)
14. [3D Scene: Particle Morphing (`scene.js`)](#14-3d-scene-particle-morphing-scenejs)
15. [3D Scene: Network Visualization (`scene2.js`)](#15-3d-scene-network-visualization-scene2js)
16. [Agent Data & Pathfinding (`agentData.js`)](#16-agent-data--pathfinding-agentdatajs)
17. [Color Palette & Design System](#17-color-palette--design-system)
18. [Key Design Patterns](#18-key-design-patterns)
19. [Dead / Unused Files](#19-dead--unused-files)

---

## 1. Project Overview

An immersive full-stack agentic web app. The user builds a personal AI agent (Agent Studio + onboarding), explores a 3D network of 1,401 agents, runs an Azure-OpenAI life simulation, views 3 predicted life paths, tracks personal finances (Runway), and engages a community feed. A separate developer control plane exposes LLM telemetry and quality-eval pipelines.

**Auth:** there is no login gate. On mount the app silently calls `/api/auth/guest` to obtain a token, so every page works immediately. Email/password pages exist in `pages/` but are not routed.

**Main app navigation** is a persistent bottom nav with 4 tabs: **Runway · Web · Agent · Community**. Timeline and the Developer plane are reached contextually.

---

## 2. Tech Stack & Dependencies

From `package.json` (name still `unimind-react`):

| Package | Version | Role |
|---|---|---|
| `react` / `react-dom` | ^18.3.1 | UI |
| `three` | ^0.128.0 | WebGL 3D |
| `framer-motion` | ^10.18.0 | Animation |
| `lucide-react` | ^1.17.0 | Icon set |
| `tailwindcss` | ^3.4.3 | Utility CSS |
| `vite` | ^5.3.1 | Build/dev server |
| `@vitejs/plugin-react` | ^4.3.1 | JSX fast refresh |

Commands: `npm run dev` (5173) · `npm run build` · `npm run preview`.

---

## 3. File Structure

```
frontend-react/
├── index.html
├── src/
│   ├── main.jsx
│   ├── index.css                 # Tailwind + globals (incl. .form-scroll, star-twinkle keyframes)
│   ├── App.jsx                   # page state machine + bottom nav + guest-token bootstrap
│   ├── lib/
│   │   ├── api.js                # ALL API calls (user + dev)
│   │   ├── scene.js              # Three.js particle morphing (Onboarding)
│   │   ├── scene2.js             # Three.js network graph (Agentic Web)
│   │   └── agentData.js          # 1,401 agent defs + BFS pathfinding
│   ├── components/
│   │   ├── SpaceArena.jsx        # agent-to-agent "space arena" simulation (+ ArenaFullscreenOverlay)
│   │   └── VoxelCharacter.jsx    # level-based humanoid avatar (walking/facing props)
│   ├── data/
│   │   └── knowledgeBase.js      # local demo data: AGENT_LEVELS, MCP_TOOLS, SUDEEP_PROFILE,
│   │                               STUDIO_AGENTS, SIMULATION_SCENARIOS, résumé builders
│   └── pages/
│       ├── OnboardingPage.jsx
│       ├── AgenticWebPage.jsx
│       ├── TimelinePage.jsx
│       ├── CommunityPage.jsx
│       ├── RunwayPage.jsx
│       ├── AgentStudioPage.jsx
│       ├── DeveloperLoginPage.jsx
│       ├── DeveloperPage.jsx
│       └── (unused: ChatbotPage, SplashPage, LoginPage, SignupPage, SignInPage, DeveloperSignUpPage)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 4. API Layer (`api.js`)

**Location:** [src/lib/api.js](../frontend-react/src/lib/api.js). Single boundary for all backend calls — no page calls `fetch()` directly.

```js
const BASE = 'http://localhost:8000';
function getToken()    { return localStorage.getItem('unifund_token'); }      // user
function getDevToken() { return localStorage.getItem('unifund_dev_token'); }  // developer
```

Two request helpers:
- `request(method, path, body)` — attaches the user token. **On a `401` from any non-auth route it calls `refreshGuestToken()` (POST `/api/auth/guest`) and retries once.** A single in-flight refresh promise is shared.
- `devRequest(method, path, body)` — attaches the dev token; no auto-refresh.

`uploadFile(file)` uses raw `fetch` with `FormData` (no `Content-Type`, so the browser sets the multipart boundary) and also retries once on `401`.

### Exported functions (by group)

| Group | Functions |
|---|---|
| Auth | `guestLogin`, `signup`, `login` |
| Users | `getMe`, `saveOnboarding` |
| Agents | `getAgents`, `searchAgents` |
| Posts | `getPosts`, `getTrendingTags`, `createPost`, `reactToPost` |
| Simulation | `runSimulate` |
| Network | `getNetworkGrowth`, `getLeaderboard` |
| Achievements | `getAchievements` |
| Chatbot | `sendChatMessage`, `getChatHistory`, `getChatChunks`, `clearChatHistory`, `deleteChatMessage`, `enhanceContent`, `uploadFile`, `saveKnowledge` |
| Runway | `getRunwayProfile`, `updateRunwayProfile`, `getRunwayIncome`, `addRunwayIncome`, `updateRunwayIncome`, `deleteRunwayIncome`, `getRunwayCategories`, `getRunwayTransactions`, `getRunwayAccounts`, `addRunwayAccount`, `deleteRunwayAccount`, `getRunwayCharts`, `generateTransactionTip`, `runRunwaySimulate` (maps snake_case → camelCase) |
| Agent Studio | `runStudioPipeline(task, jobDescription)` |
| Developer | `devLogin`, `getDevLLMStats`, `getDevLLMRecent`, `getDevLLMHourly`, `getDevFunnel`, `getDevUsers`, `clearDevUser`, `suspendDevUser`, `deleteDevPost`, `broadcastMessage`, `getDevFlags`, `updateDevFlags`, `getDevSimStats`, `getDevSimRecent`, `getDevSimDaily`, `getDevCommunity`, `getChunkEvalStats`, `getChunkWorst`, `getChunkBest`, `getChunkAll`, `getChunksByUser`, `evalOneChunk`, `evalAllPending`, `getSimEvalStats`, `getSimEvalRecent`, `getEnhanceStats`, `getEnhanceLogs` |

---

## 5. App Router (`App.jsx`)

**Location:** [src/App.jsx](../frontend-react/src/App.jsx). No React Router — a `page` string + `AnimatePresence`.

### State

| State | Default | Description |
|---|---|---|
| `page` | `onboarding` (or `developer-login` if URL is `/developer`) | Active page |
| `bridgePhase` | `idle` | Transition orb phase |
| `isExiting` | `false` | Current page fading out |
| `userName` | `USER` | Set from guest/user `getMe()` |
| `simulationData` / `simulationKnowledgeCount` | `null` | Passed to TimelinePage |
| `chatbotCompleteTarget` | `web` | Where the Agent tab's back button returns |

**Page values:** `onboarding`, `transitioning`, `web`, `chatbot` (renders Agent Studio), `community`, `runway`, `timeline`, `developer-login`, `developer`.

### Guest-token bootstrap
On mount (non-developer routes): if `unifund_token` exists it verifies via `getMe()`; otherwise it calls `guestLogin()` and stores the token. Failures warn (backend offline) but don't block the UI.

### Bottom nav
`BottomNav` shows the 4 `MAIN_TABS` (`runway`, `web`, `chatbot`, `community`) — the "Agent" label maps to `chatbot`. A `layoutId="nav-active"` pill slides between tabs; centering is done via Framer Motion `x: '-50%'` (not a static transform).

### Navigation
| From | To | Trigger |
|---|---|---|
| onboarding | web | `handleEnter(answers)` — saves onboarding, plays 1s bridge transition |
| web | community / runway / chatbot / developer | TopBar buttons / bottom nav |
| web | timeline | `onNavigateTimeline(data, kCount)` after simulation |
| timeline | web / chatbot | `onBack` / `onChatbot` |
| `/developer` URL | developer-login → developer | `DeveloperLoginPage onSuccess` |

---

## 6. Page: Onboarding

**Location:** [src/pages/OnboardingPage.jsx](../frontend-react/src/pages/OnboardingPage.jsx). Chat-style adaptive 3-question form (focus → adaptive goal → fear) beside a morphing 3D particle scene (`dust → molecule → dna → brain`). Responsive: stacks below `lg`, internal scroll via `.form-scroll`. Emits `{focus, goal, fear}` (each `{choice, custom}`) to `App.handleEnter`, which POSTs to `/api/users/me/onboarding`.

---

## 7. Page: Agentic Web

**Location:** [src/pages/AgenticWebPage.jsx](../frontend-react/src/pages/AgenticWebPage.jsx). The "Web" tab and main hub. Full-screen 3D network (`scene2.js`) of 1,401 agents; clicking the Core fires `runSimulate()` concurrently with the ~5s animation, then `PortalNext` offers "Continue to Your Timeline →" (`onNavigateTimeline(simData, simKnowledgeCount)`).

Also includes a slide-in **Simulator panel** (free-text + quick scenarios + a demo query) and a "Developer" button (`onNavigateDeveloper`). Other navigation is via the bottom nav.

---

## 8. Page: Timeline

**Location:** [src/pages/TimelinePage.jsx](../frontend-react/src/pages/TimelinePage.jsx). Renders the 3 life paths. `AgenticWebPage` already unwraps the API response (`setSimData(res.simulation)`) before passing it up, so the `simulationData` prop here is the inner simulation object and the page reads `data.paths` (each milestone is a `{month, event}` object). If `simulationData` is null it calls `runSimulate()` itself and uses `res.simulation`. Shows a `ContextQualityBanner` keyed to `knowledgeCount` (Minimal → Deep Signal), animated `PathCard`s (probability bar, milestones, `agent_match`), and a `ChatbotCTA` ("Enrich Your Agent" → `onChatbot`). Shows a loading skeleton while fetching.

---

## 9. Page: Community

**Location:** [src/pages/CommunityPage.jsx](../frontend-react/src/pages/CommunityPage.jsx). Social feed on real API data (`getPosts`, `createPost`, `reactToPost`, `getLeaderboard`, `getAchievements`, `getTrendingTags`). Agentic redesign: posts shown as "Agent of [User]" with level rings, A2A badges, post-type filters (Question/Problem/Achievement/Resource), `SortSelector` (Hot/New/Top/Rising), `ProfileCard` (real score + badges), `FeaturedStoriesBar`, `A2AProtocolFeed` (live ticker + counter, client-side), `TrendingSection`, `SuggestedConnections`. The live feed is still client-side only (no WebSocket).

---

## 10. Page: Runway

**Location:** [src/pages/RunwayPage.jsx](../frontend-react/src/pages/RunwayPage.jsx). Personal-finance tracker. Most UI runs on local state, but two features call the backend:
- **AI savings plan** → `runRunwaySimulate(monthlyIncome, expenses)` (`POST /api/runway/simulate`) — returns surplus math, a split, yearly projection, and 4 personalised recommendations.
- **Per-transaction tip** → `generateTransactionTip(merchant, category, amount, dateLabel)` (`POST /api/runway/tip`).

The backend also exposes full CRUD for income/categories/transactions/accounts/charts (seeded for demo user **Ramya**), available in `api.js` for future wiring.

---

## 11. Page: Agent Studio (the "Agent" tab)

**Location:** [src/pages/AgentStudioPage.jsx](../frontend-react/src/pages/AgentStudioPage.jsx). Routed by the `chatbot` page key (bottom-nav label "Agent"); it replaced the old `ChatbotPage`.

- **Level system** BABY → SMALL → MIDDLE → HIGH → MAX driven by connected **MCP tools** (`data/knowledgeBase.js → MCP_TOOLS`, weighted chunks) plus chat chunks. Connecting/disconnecting tools in the **Tools** tab recomputes the level live.
- **Left sidebar tabs:** Agent (bio/goals/skills from `SUDEEP_PROFILE`), Tools (connect/disconnect), Knowledge (imported chunks).
- **Right sidebar:** `CharacterCard` (a `VoxelCharacter` that visibly upgrades with level) + the live `SpaceArena` simulation, with a fullscreen overlay.
- **Chat** uses `sendChatMessage` with a graceful offline fallback and a multi-agent "thinking pipeline."
- **Résumé pipeline:** paste a job description (or use the résumé toggle / file upload) → `runStudioPipeline('resume', jd)` (`POST /api/studio/run`) → replays the `agent_logs` in the Space Arena → renders a downloadable `.doc` résumé. A local deterministic builder in `knowledgeBase.js` provides an offline fallback.

---

## 12. Developer Plane (Login + Control Plane)

- **DeveloperLoginPage** ([src/pages/DeveloperLoginPage.jsx](../frontend-react/src/pages/DeveloperLoginPage.jsx)) — terminal-style boot UI. Calls `devLogin()` (`POST /api/dev/auth`), stores `unifund_dev_token`, then `onSuccess` → `developer`. Reached at `http://localhost:5173/developer`.
- **DeveloperPage** ([src/pages/DeveloperPage.jsx](../frontend-react/src/pages/DeveloperPage.jsx)) — multi-tab control plane backed entirely by `/api/dev/*` (no mock data): LLM Health, Onboarding Funnel, User List (clear/suspend), Simulation Monitor, Controls (feature flags, broadcast, delete post), Community Health, plus the three eval pipelines (chunk eval, simulation eval, enhance guard).

---

## 13. Shared Components

- **`VoxelCharacter`** ([src/components/VoxelCharacter.jsx](../frontend-react/src/components/VoxelCharacter.jsx)) — blocky humanoid avatar configured per `AGENT_LEVELS` (suit/tie/hair, crown + aura at MAX). Props `walking` (walk-cycle) and `facing` (flip via `scaleX`).
- **`SpaceArena`** ([src/components/SpaceArena.jsx](../frontend-react/src/components/SpaceArena.jsx)) — self-contained sci-fi simulation driven by `statuses`/`logs` state: starfield + nebula + docking pods for the 12 `STUDIO_AGENTS`, crew sprites that walk to the central Command Core and exchange "knowledge photons," a story ticker, and an `ArenaFullscreenOverlay` (Esc to close).

---

## 14. 3D Scene: Particle Morphing (`scene.js`)

**Location:** [src/lib/scene.js](../frontend-react/src/lib/scene.js). `createUniMindScene(container)` → `{ transitionTo(stage), destroy() }`. Stages `dust | molecule | dna | brain`. `PARTICLE_COUNT = 6,000`, 600 brain sparks. Per-particle morph delay/speed with exponential ease-out; cyan/purple/pink color blend; additive glow. Listens to window resize.

---

## 15. 3D Scene: Network Visualization (`scene2.js`)

**Location:** [src/lib/scene2.js](../frontend-react/src/lib/scene2.js). `createUniMindWeb(container)` returns a callback/command API:

```js
scene.onCoreHover(fn); scene.onCoreClick(fn); scene.onPhase(fn); scene.onPortal(fn); scene.onNodeClick(fn);
scene.runSimulation(); scene.resetSimulation(); scene.flyToNode(v3); scene.highlightNode(idx, edges);
scene.clearHighlight(); scene.setFilters(mask); scene.setVisibleNodeCount(n); scene.setTimeframe(id);
scene.getGraphData(); scene.projectNodeToScreen(idx); scene.getCoreScreenPos(); scene.destroy();
```

1,401 nodes in 3 shells (inner 55% / mid 30% / outer 15%). Node types 0=New `#E3F2FD`, 1=Community `#4FC3F7`, 2=Expert `#B388FF`, 3=You `#FFD54F`. Starfield, dust, flow particles, signal/convergence systems, custom GLSL node/line shaders, and a 4-phase ~6s simulation timeline ending in a white-out portal (`portalT → 1`). `UnrealBloomPass` on non-mobile.

---

## 16. Agent Data & Pathfinding (`agentData.js`)

**Location:** [src/lib/agentData.js](../frontend-react/src/lib/agentData.js). Exports `AGENTS, USER_IDX, hydrateAgents, setUserName, bfsPath, pathToEdgeIndices`. 30 hand-crafted agents (validated ARIA=9842, NOX=9120, VEDA=8633), procedural agents via `xorshift32(seed)`, and a `YOU` node. BFS pathfinding with `Uint8Array`/`Int32Array`; edge key `min*10000+max`. The Python backend mirrors this RNG exactly.

---

## 17. Color Palette & Design System

Primary gradient `#00D1FF → #7B61FF → #FF5FB6`. Background `#02030A`. Glass card `rgba(255,255,255,0.03)` bg + `rgba(255,255,255,0.08)` border + `blur(20px)`. Muted text `rgba(255,255,255,0.35)`. All page/card animation easing `[0.22, 1, 0.36, 1]`. Global scrollbars are hidden; `.form-scroll` is a higher-specificity opt-in (cyan→purple thumb) used by the onboarding chat column.

---

## 18. Key Design Patterns

1. **Manual page routing** via `App.jsx` state + `AnimatePresence`.
2. **Lazy-loaded pages** (`React.lazy` + `<Suspense>`); only `DeveloperLoginPage` is eager.
3. **Guest-first auth** — token obtained on mount; `api.js` auto-refreshes on `401`.
4. **Imperative Three.js modules** — scenes are factory functions with callback/command APIs; React mounts in `useEffect`, never polls.
5. **Seeded procedural generation** — `xorshift32` keeps topology stable and matches the backend.
6. **Single API boundary** — `src/lib/api.js`; endpoint changes are one-file edits.
7. **Custom GLSL shaders** + additive blending + bloom for the network glow.
8. **Glassmorphism** layered over the 3D scenes.

---

## 19. Dead / Unused Files

Present in `src/pages/` but **not** imported by `App.jsx` (kept for reference / future re-enable; safe to ignore):

- `ChatbotPage.jsx` — superseded by `AgentStudioPage` for the Agent tab (still lazy-imported in `App.jsx` but not rendered).
- `SplashPage.jsx`, `LoginPage.jsx`, `SignupPage.jsx`, `SignInPage.jsx`, `DeveloperSignUpPage.jsx` — not routed.
