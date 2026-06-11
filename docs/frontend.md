# UniMind React — Frontend Documentation

> Complete reference for the frontend codebase as of May 2026 (full-stack version with Python backend).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [File Structure](#3-file-structure)
4. [API Layer (`api.js`)](#4-api-layer-apijs)
5. [App Router (`App.jsx`)](#5-app-router-appjsx)
6. [Page: Login / Signup](#6-page-login--signup)
7. [Page: Chatbot (`ChatbotPage.jsx`)](#7-page-chatbot-chatbotpagejsx)
8. [Page: Onboarding (`OnboardingPage.jsx`)](#8-page-onboarding-onboardingpagejsx)
9. [Page: Agentic Web (`AgenticWebPage.jsx`)](#9-page-agentic-web-agenticwebpagejsx)
10. [Page: Timeline (`TimelinePage.jsx`)](#10-page-timeline-timelinepagejsx)
11. [Page: Community (`CommunityPage.jsx`)](#11-page-community-communitypagejsx)
12. [Page: Runway (`RunwayPage.jsx`)](#12-page-runway-runwaypagejsx)
13. [3D Scene: Particle Morphing (`scene.js`)](#13-3d-scene-particle-morphing-scenejs)
14. [3D Scene: Network Visualization (`scene2.js`)](#14-3d-scene-network-visualization-scene2js)
15. [Agent Data & Pathfinding (`agentData.js`)](#15-agent-data--pathfinding-agentdatajs)
16. [Color Palette & Design System](#16-color-palette--design-system)
17. [Key Design Patterns](#17-key-design-patterns)
18. [Data Flow Diagram](#18-data-flow-diagram)

---

## 1. Project Overview

UniMind is an immersive, full-stack agentic web application. Users build a personal AI agent through a chatbot knowledge interview and a 3-step onboarding questionnaire, then enter an interactive 3D social network of 1,401 AI agents, run a life simulation powered by Azure OpenAI, view 3 predicted life paths on a timeline, and connect with a community feed. A developer runway tracker (RunwayPage) is also accessible from the main hub.

**Core user journey:**
```
Onboarding (3 questions) → Agentic Web (3D network) → Simulation → Timeline (3 life paths)
                                    ↓
                              Community Feed
                                    ↓
                             Runway Tracker
```

**Note on auth:** Login/Signup pages exist and are fully implemented but are currently bypassed. The app starts directly at Onboarding. See `setup.md` for re-enabling.

---

## 2. Tech Stack & Dependencies

| Package | Version | Role |
|---|---|---|
| `react` | 18.3.1 | UI framework |
| `react-dom` | 18.3.1 | DOM rendering |
| `three` | 0.128.0 | WebGL 3D graphics |
| `framer-motion` | 10.18.0 | Declarative animations |
| `tailwindcss` | 3.4.3 | Utility CSS framework |
| `vite` | 5.3.1 | Build tool / dev server |
| `@vitejs/plugin-react` | 4.3.1 | JSX fast refresh |

**Build commands:**
- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — Production build
- `npm run preview` — Preview production build

---

## 3. File Structure

```
frontend-react/
├── index.html
├── src/
│   ├── main.jsx                   # React entry point
│   ├── index.css                  # Global styles + Tailwind
│   ├── App.jsx                    # Page router + cinematic transitions
│   ├── lib/
│   │   ├── api.js                 # ALL API calls (never use fetch() in pages)
│   │   ├── scene.js               # Three.js particle morphing (Onboarding)
│   │   ├── scene2.js              # Three.js network graph (Agentic Web)
│   │   └── agentData.js           # 1,401 agent definitions + BFS pathfinding
│   └── pages/
│       ├── LoginPage.jsx          # Email/password login (currently bypassed)
│       ├── SignupPage.jsx         # Name/email/password signup (currently bypassed)
│       ├── ChatbotPage.jsx        # AI knowledge interview + file upload + enhancer
│       ├── OnboardingPage.jsx     # Chat-style 3-question form + 3D particles
│       ├── AgenticWebPage.jsx     # Interactive 3D network + simulation trigger
│       ├── TimelinePage.jsx       # 3 life path cards + context quality banner
│       ├── CommunityPage.jsx      # Social feed (real API data)
│       └── RunwayPage.jsx         # Developer financial runway tracker
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 4. API Layer (`api.js`)

**Location:** [src/lib/api.js](../frontend-react/src/lib/api.js)

Single file for all backend communication. All pages import named functions from here — no page ever calls `fetch()` directly.

### Pattern

```js
const BASE = 'http://localhost:8000';

function getToken() { return localStorage.getItem('unimind_token'); }
function authHeaders() { /* includes Bearer token if present */ }

async function request(method, path, body) { /* throws on non-2xx */ }
```

### Exported Functions

| Function | Method | Endpoint |
|---|---|---|
| `signup(email, password, name)` | POST | `/api/auth/signup` |
| `login(email, password)` | POST | `/api/auth/login` |
| `getMe()` | GET | `/api/users/me` |
| `saveOnboarding(answers)` | POST | `/api/users/me/onboarding` |
| `getAgents(page)` | GET | `/api/agents?page=N` |
| `searchAgents(q)` | GET | `/api/agents/search?q=` |
| `getPosts()` | GET | `/api/posts` |
| `getTrendingTags()` | GET | `/api/posts/trending` |
| `createPost(text, tag)` | POST | `/api/posts` |
| `reactToPost(id, emoji)` | POST | `/api/posts/{id}/react` |
| `runSimulate()` | POST | `/api/simulate` |
| `getNetworkGrowth(timeframe)` | GET | `/api/network/growth?timeframe=` |
| `getLeaderboard()` | GET | `/api/leaderboard` |
| `getAchievements(userId)` | GET | `/api/achievements/{id}` |
| `sendChatMessage(content)` | POST | `/api/chatbot/message` |
| `getChatHistory()` | GET | `/api/chatbot/history` |
| `clearChatHistory()` | DELETE | `/api/chatbot/history` |
| `deleteChatMessage(id)` | DELETE | `/api/chatbot/history/{id}` |
| `enhanceContent(content)` | POST | `/api/chatbot/enhance` |
| `uploadFile(file)` | POST | `/api/chatbot/upload` (multipart) |
| `saveKnowledge(content, category)` | POST | `/api/chatbot/knowledge` |

`uploadFile` uses raw `fetch` with `FormData` (no `Content-Type` override so the browser sets the multipart boundary). All other functions use the shared `request()` helper.

---

## 5. App Router (`App.jsx`)

**Location:** [src/App.jsx](../frontend-react/src/App.jsx)

Manages which page is visible and orchestrates cinematic transitions.

### State

| State | Type | Default | Description |
|---|---|---|---|
| `page` | `string` | `'onboarding'` | Active page |
| `bridgePhase` | `string` | `'idle'` | Transition orb phase |
| `isExiting` | `boolean` | `false` | Current page fading out |
| `userName` | `string` | `'USER'` | Set from auth or left as default |
| `authUser` | `object\|null` | `null` | Full user object from `/api/users/me` |
| `simulationData` | `object\|null` | `null` | LLM simulation result passed to TimelinePage |
| `simulationKnowledgeCount` | `number\|null` | `null` | Knowledge chunks used in simulation |
| `chatbotCompleteTarget` | `string` | `'onboarding'` | Where chatbot returns on completion |

**Valid page values:** `'login'` `'signup'` `'chatbot'` `'onboarding'` `'transitioning'` `'agentic'` `'timeline'` `'community'` `'runway'`

### Lazy Loading

All pages except `LoginPage` and `SignupPage` are loaded via `React.lazy()` wrapped in `<Suspense fallback={<PageLoader />}>`. `PageLoader` renders a spinning ring on the dark background.

### Navigation

| From | To | Trigger |
|---|---|---|
| onboarding | agentic | `handleEnter(answers)` — cinematic transition |
| agentic | community | `onNavigateCommunity` prop |
| agentic | chatbot | `onNavigateChatbot` prop |
| agentic | runway | `onNavigateRunway` prop |
| agentic | timeline | `onNavigateTimeline(data, kCount)` prop |
| timeline | agentic | `onBack` prop |
| timeline | chatbot | `onChatbot` prop (sets `chatbotCompleteTarget='agentic'`) |
| community | agentic | `onBack` prop |
| runway | agentic | `onBack` prop |
| chatbot | target | `onComplete` prop → navigates to `chatbotCompleteTarget` |

### `handleEnter(answers)` — Transition Orchestration

Called when the user completes onboarding. Non-blockingly saves answers to backend then runs a 4-phase timed transition:

| Time | Action |
|---|---|
| `0ms` | `isExiting = true`, `bridgePhase = 'shrink-in'`, `page = 'transitioning'` |
| `400ms` | `bridgePhase = 'shrink-out'` |
| `800ms` | `bridgePhase = 'hold'` |
| `1000ms` | `page = 'agentic'`, `bridgePhase = 'idle'` |

### `TransitionBridge` Component

An animated orb rendered at `z-index: 9999` during transitions. Three concentric layers: outer glow, conic gradient core, white hot center. Framer Motion drives scale/opacity.

---

## 6. Page: Login / Signup

**Locations:** [src/pages/LoginPage.jsx](../frontend-react/src/pages/LoginPage.jsx) | [src/pages/SignupPage.jsx](../frontend-react/src/pages/SignupPage.jsx)

Fully implemented but **currently bypassed** (commented out in App.jsx). Start at onboarding directly.

- **LoginPage** — Email/password form → `login()` → stores JWT → `onLoginSuccess(user)`
- **SignupPage** — Name/email/password → `signup()` → stores JWT → `onSignupSuccess(user)` → navigates to ChatbotPage

Both use the same glassmorphism design language, gradient submit button, inline error display.

---

## 7. Page: Chatbot (`ChatbotPage.jsx`)

**Location:** [src/pages/ChatbotPage.jsx](../frontend-react/src/pages/ChatbotPage.jsx)

AI knowledge interview. Builds the user's agent profile through a multi-turn conversation. Launched after signup (or via "Enrich Agent" from TimelinePage).

### Layout

Three-column: `Left panel (profile)` | `Chat area (center)` | Hidden (single-column on smaller views)

### Key Features

**Conversation flow:**
- Loads history on mount via `getChatHistory()`
- Uses `useRef` guard to prevent React 18 strict-mode double-init (duplicate opening message)
- Suggestion chips — 4 quick-reply options per conversation stage, advance every 2 AI messages
- Gamified: +50 XP per knowledge chunk saved, level labels (Novice → Emerging → Expert), milestone toasts at 3/7/12 chunks

**File upload:**
- Paperclip button opens `<input type="file">` (PDF/DOCX/TXT/PNG/JPEG/WEBP/GIF)
- Calls `uploadFile(file)` → spinner → extracted text stored as `pendingFile`
- Shown as chip above input; prepended to message on send

**Content Enhancer:**
- ✦ button calls `enhanceContent(content)` → shows `EnhancePanel`
- Side-by-side: original brief vs. AI-expanded statement
- User can edit inline, then "Send Enhanced" or "Send Original"

**Per-message delete:**
- Hover any bubble → red × button appears
- Calls `deleteChatMessage(id)`

**Clear history:**
- Button in ProfilePanel footer with confirmation step
- Calls `clearChatHistory()`

### State

| State | Description |
|---|---|
| `messages` | `[{id, role, content, created_at}]` |
| `input` | Current textarea value |
| `isTyping` | AI "typing..." indicator |
| `profileData` | `{bio, skills, score, level, xp, chunks}` |
| `pendingFile` | Extracted text from uploaded file |
| `enhancePanel` | `{visible, original, enhanced, edited}` |
| `stage` | Current conversation stage (drives chip suggestions) |

### Sub-Components

- **`ProfilePanel`** — Left sidebar. Shows agent avatar, level badge, XP progress bar, bio text (updates live), skills chips, chunk count, clear history button.
- **`MessageBubble`** — Renders user (right, gradient) or assistant (left, glass) messages. Hover shows delete button.
- **`SuggestionChips`** — 4 quick-reply chips per stage. Clicking fills and sends the message.
- **`EnhancePanel`** — Overlay showing original vs. enhanced content with inline editing.
- **`MilestoneToast`** — Fixed top banner celebrating 3/7/12 chunks saved.

---

## 8. Page: Onboarding (`OnboardingPage.jsx`)

**Location:** [src/pages/OnboardingPage.jsx](../frontend-react/src/pages/OnboardingPage.jsx)

First screen. Collects 3 adaptive answers in a chat-style bubble UI while morphing a 3D particle system through 4 shapes.

### Layout
Two-column: `45% chat form` | `55% 3D scene`

### Conversation Style
Previous Q&A appears as message bubbles (AI question bubble + user answer bubble) as the user progresses. Current question and answer choices are shown below the bubble history.

### Questions (adaptive)

**Step 0 — id: `focus`**
"What are you currently focused on?"
Options: Student | Founder | Career Switch | Exploring Life

**Step 1 — id: `goal`** (adaptive based on Step 0)
- Student → "Masters Abroad / Research / First Job / Startup"
- Founder → "Raise Seed / Revenue / Team / Launch"
- Career Switch → "New Industry / New Role / Freelance / Abroad"
- Exploring → "Self-discovery / Travel / New Skills / Side Project"

**Step 2 — id: `fear`**
"What worries you most?"
Options: Failure | Financial Risk | Loneliness | Choosing Wrong Path

### Stage Progression

| Step | 3D Stage |
|---|---|
| Initial | `dust` — scattered sphere |
| 0 → 1 | `molecule` — 8-atom cluster |
| 1 → 2 | `dna` — double helix |
| 2 → done | `brain` — cortex structure |

### Data Passed to App
```js
{
  focus: { choice: "Student", custom: "" },
  goal:  { choice: "Masters Abroad", custom: "" },
  fear:  { choice: "Failure", custom: "" }
}
```
`App.handleEnter(answers)` non-blockingly POSTs to `/api/users/me/onboarding`.

---

## 9. Page: Agentic Web (`AgenticWebPage.jsx`)

**Location:** [src/pages/AgenticWebPage.jsx](../frontend-react/src/pages/AgenticWebPage.jsx)

The main hub. Full-screen 3D network of 1,401 agents. Central sphere triggers the life simulation.

### Key State

| State | Description |
|---|---|
| `phase` | Simulation phase (0=idle, 1–4=active) |
| `portalT` | Portal progress 0→1 (drives white-out) |
| `simData` | Simulation result from `/api/simulate` |
| `simKnowledgeCount` | Knowledge count from simulation response |
| `selectedNode` | Node info + BFS path distance |
| `filters` | `{0:1,1:1,2:1,3:1}` node type visibility |
| `timelineDay` | Scrubber position (0–102) |
| `searchQuery` | Search bar text |

### Simulation Integration

When the user clicks the UniMind Core:
1. `sceneRef.current.runSimulation()` starts the 5-second visual animation
2. `runSimulate()` API call fires concurrently (non-blocking)
3. Result stored in `simData` + `simKnowledgeCount`
4. `PortalNext` appears at `portalT >= 0.95`
5. "Continue to Your Timeline →" calls `onNavigateTimeline(simData, simKnowledgeCount)`

### Navigation Buttons (TopBar)
- **"Community →"** → `onNavigateCommunity`
- **"Runway →"** → `onNavigateRunway`
- **"Chatbot"** → `onNavigateChatbot`

### Sub-Components (same as original, plus)

**`PortalNext`** — Post-simulation overlay. Shows "Your timeline is forming" + stats. "Continue to Your Timeline →" passes simulation data upstream. "Return to web" calls `resetAll()`.

All other sub-components from the original version remain: `WebSceneHost`, `TopBar`, `LeftPanel`, `GrowthTimeline`, `TimelineScrubber`, `NodeFilterPanel`, `SearchBar`, `NodeLabels`, `NodeDetailTooltip`, `LeaderboardButton`, `LeaderboardModal`, `CoreLabel`, `CoreHover`, `SimulationHUD`, `HintBanner`, `NavHint`, `EntryOverlay`, `PortalOverlay`, `DustOverlay`.

---

## 10. Page: Timeline (`TimelinePage.jsx`)

**Location:** [src/pages/TimelinePage.jsx](../frontend-react/src/pages/TimelinePage.jsx)

Full-screen display of the 3 LLM-generated life paths. Accepts `simulationData` and `knowledgeCount` props from App.

### Layout

Single scrollable column: TopBar → ContextQualityBanner → 3 PathCards → ChatbotCTA

### Sub-Components

**`ContextQualityBanner`**
Shows "Signal Quality" based on `knowledgeCount`:
- 0 chunks → Minimal Signal
- 1–2 → Basic
- 3–6 → Moderate
- 7–11 → Strong
- 12+ → Deep Signal

Animated gradient bar, explains that more knowledge = more accurate predictions.

**`PathCard`** (3 rendered)
Each card shows:
- Probability bar (animated fill, gradient glow border on hover)
- Path title + animated icon
- Tagline
- 3 vertical milestone markers (timeline dots + text)
- "Network Match: {agent_match}" badge
- Expand/collapse chevron for full detail

**`ChatbotCTA`**
Below the paths. Explains the context→accuracy relationship and shows "Enrich Your Agent" button → `onChatbot()` prop.

**"Enrich Agent" button** (TopBar)
Navigates to ChatbotPage and returns to AgenticWebPage when done (not back to onboarding).

### Loading State
If `simulationData` is `null` (navigation before simulation completes), shows animated loading state — pulsing path card skeletons + "Synthesising your paths..." message.

---

## 11. Page: Community (`CommunityPage.jsx`)

**Location:** [src/pages/CommunityPage.jsx](../frontend-react/src/pages/CommunityPage.jsx)

Social feed. All data loaded from the real API.

### Layout
Two-column: `Feed (left, wide)` | `Right Sidebar (right, narrow)`

### Data Fetching (on mount)
- `getPosts()` → feed
- Inside ProfileCard: `getMe()` + `getAchievements(user.id)` in parallel

### Sub-Components

**`AnimatedNumber`**
Springs from 0 to a real value using `useMotionValue` + `useSpring`. Used for profile stats.

**`ProfileCard`** (top of feed)
- Rotating gradient ring avatar
- Real `agent_score`, real `posts_count` from `getMe()`
- Real earned badges from `getAchievements()`
- Loading skeleton while fetching

**`FeaturedStoriesBar`**
Horizontal infinite-scroll row of top 12 agents from `getLeaderboard()`. Duplicated list with `useAnimationControls` loop. Gradient fade masks on edges.

**`SortSelector`**
Replaces tabs — Hot / New / Top / Rising. Animated sliding pill via Framer Motion `layoutId="sort-pill"`.

Sort logic (`sortedPosts` useMemo):
- Hot → by total reactions
- New → API order (newest first)
- Top → by highest reaction count
- Rising → recent posts (s/m ago) by reactions

**`PostCard`**
- Gradient left glow border on hover
- HOT 🔥 badge (>300 total reactions), trending ✦ sparkle (>150)
- Expand/collapse for long posts (>200 chars)
- Reaction burst animation (scale 1.35 + brightness flash)
- Gradient avatar circle, reply count
- Post tags with color background

**`PostComposer`**
- 280-char counter (red when <30 left)
- 9 tag options
- Broadcast button glow-pulse animation
- Calls `createPost(text, tag)`

**`TrendingSection`** (right sidebar)
- Fetches `getTrendingTags()`
- Animated bar chart per tag
- Falls back to static data on error

**`SuggestedConnections`** (right sidebar)
- Fetches `getLeaderboard()`, shows top 4 agents
- "Connect" button (UI only)

**`LiveFeed`** (right sidebar)
- `getEventMeta()` maps event text to icon + color (◎/⚡/🧬/📡/🌐)
- New events auto-added every 4s (client-side only — no WebSocket yet)

**Post stagger:** `motion.div` container with `staggerChildren: 0.06` wraps `AnimatePresence`.

---

## 12. Page: Runway (`RunwayPage.jsx`)

**Location:** [src/pages/RunwayPage.jsx](../frontend-react/src/pages/RunwayPage.jsx)

Developer financial runway tracker. Fully client-side (no backend API calls — all data is local state).

Accessible from AgenticWebPage via the "Runway →" button in the TopBar.

### Features

**Runway Gauge** — SVG semicircle gauge showing months of runway. Color: green (≥6mo), yellow (3–6mo), pink (<3mo).

**Income Sources** — Add/remove income streams (Salary, Freelance, Side Project, Sponsorship, Content, Bug Bounty, Other). Editable amounts. Total income shown.

**Expense Categories** — 11 preset dev-focused categories (Rent, Groceries, Cloud, Dev Tools, SaaS/AI, Learning, Domains, Transport, Food, Health, Hardware). Edit budget and spent per category.

**Monthly History Chart** — 12-month bar chart with color coding (safe/mid/high/future). Hover tooltip shows note for each month. Future months shown with hatched pattern.

**AI Insights panel** — 5 static tips mapping to the expense breakdown (cloud, AI subscriptions, infra alternatives, learning budget status, freelance income impact).

**Dev Deals** — List of 6 developer discounts/free tiers (GitHub Education, JetBrains Student, AWS Free Tier, Vercel Hobby, Cloudflare Free, Notion Education).

**Savings editor** — Click-to-edit current cash balance.

### State
All data in local state with seed defaults. Amounts update runway gauge live via `useMemo`:
```
runway = savings / Math.abs(monthlyExpenses - totalIncome)   // if net negative
```

---

## 13. 3D Scene: Particle Morphing (`scene.js`)

**Location:** [src/lib/scene.js](../frontend-react/src/lib/scene.js)

Creates and manages the Three.js particle scene on the Onboarding page.

### API

```js
import { createUniMindScene } from './lib/scene.js'
const scene = createUniMindScene(domContainer)
scene.transitionTo('molecule')  // 'dust' | 'molecule' | 'dna' | 'brain'
scene.destroy()
```

### Configuration

| Constant | Value |
|---|---|
| `PARTICLE_COUNT` | 6,000 |
| Stages | `dust`, `molecule`, `dna`, `brain` |
| Spark count (brain) | 600 |

### Target Shape Generators

**`genDust(n)`** — Uniform spherical scatter, radius 6–14 units.

**`genMolecule(n)`** — 8 atom positions. 30% at atom centers, 70% along 13 bond connections.

**`genDNA(n)`** — Two helix strands offset by π. 72% along strands, 28% on horizontal rungs.

**`genBrain(n)`** — Two cortex hemispheres with sinusoidal gyri, cerebellum, brainstem, interior neural nodes.

### Particle System

- Single `THREE.BufferGeometry` with position + color attributes
- Per-particle morph delay (0–0.6s) and speed (0.9–1.5×)
- Interpolation: `k = 1 - Math.exp(-afterDelay * 2.2 * speed)` (exponential ease-out)
- Color: random blend of cyan/purple/pink per particle
- Glow core `THREE.Sprite` changes color per stage
- Spark layer (brain only): 600 breathing particles around brain surface

---

## 14. 3D Scene: Network Visualization (`scene2.js`)

**Location:** [src/lib/scene2.js](../frontend-react/src/lib/scene2.js)

Full interactive 3D network graph for AgenticWebPage.

### API

```js
const scene = createUniMindWeb(domContainer)

// Callbacks
scene.onCoreHover(bool => void)
scene.onCoreClick(() => void)
scene.onPhase(n => void)
scene.onPortal(t => void)           // 0.0–1.0
scene.onNodeClick(idx => void)

// Controls
scene.runSimulation()
scene.resetSimulation()
scene.flyToNode(position)           // Vector3
scene.highlightNode(idx, edgeArr)
scene.clearHighlight()
scene.setFilters(maskObj)           // { 0,1,2,3: 0|1 }
scene.setVisibleNodeCount(n)
scene.setTimeframe(id)              // 'past'|'this'|'all'

// Queries
scene.getGraphData()                // { positions, edges, adjacency, connEdgeMap }
scene.projectNodeToScreen(idx)      // { x, y } | null
scene.getCoreScreenPos()            // { x, y }
scene.destroy()
```

### Node Distribution

**Total nodes:** 1,401 (0–1399 = network, 1400 = user)

| Layer | % | Shell radius | Y flatten |
|---|---|---|---|
| Inner | 55% | 9–22 | 0.55 |
| Mid | 30% | 22–36 | 0.50 |
| Outer | 15% | 36–52 | 0.45 |

**Node types:** 0=New (#E3F2FD), 1=Community (#4FC3F7), 2=Expert (#B388FF), 3=You (#FFD54F)

### Special Objects

- **Starfield** — 1,400 particles at 60–180 units, slow Y rotation
- **Dust Floaters** — 260 semi-transparent bouncing particles
- **Flow Particles** — 220 particles travelling along Bezier connections
- **Signal Particles (Phase 1)** — 200 particles expanding as wave from origin
- **Convergence Stream (Phase 3)** — 500 particles streaming inward to origin

### Custom Shaders

- **Node shader** — pulse via `sin(uTime + aPhase)`, highlight dimming (non-highlighted → 30% size)
- **Line shader** — signal wave glow, BFS path highlighting, entry reveal, hidden edge discard

### Simulation Timeline

| Phase | Duration | Visual |
|---|---|---|
| 1 | 0–1.5s | Signal wave expands; connection lines glow |
| 2 | 1.5–3.0s | Camera zooms in; flow particles max speed |
| 3 | 3.0–4.5s | Convergence streams; global pulse |
| 4 | 4.5–6.0s | Portal rings expand; white-out; `portalT` → 1 |

### Post-Processing

`THREE.UnrealBloomPass` (non-mobile only). Bloom strength: 0.8 (idle) → 1.2 (entry) → 2.5 (Phase 3).

---

## 15. Agent Data & Pathfinding (`agentData.js`)

**Location:** [src/lib/agentData.js](../frontend-react/src/lib/agentData.js)

Defines all 1,401 agent identities and provides BFS pathfinding.

### Exports

```js
export { AGENTS, USER_IDX, hydrateAgents, setUserName, bfsPath, pathToEdgeIndices }
```

### Agent Shape

```js
{
  idx: number,         // Index 0–1400
  name: string,        // "ARIA"
  fullName: string,    // "ARIA-9 Neural Architect"
  type: number,        // 0=New, 1=Community, 2=Expert, 3=You
  icon: string,        // Emoji
  bio: string,
  score: number,
}
```

### Notable Agents (0–29)

30 hand-crafted agents. Validated scores: ARIA=9842, NOX=9120, VEDA=8633.

### Procedural Agents (30–1399)

`xorshift32(seed)` RNG seeded by agent index. Name = `PREFIXES[i%50] + SUFFIXES[j%30]`.

### BFS Pathfinding

```js
bfsPath(adjacency, fromIdx, toIdx) → number[] | null
pathToEdgeIndices(path, connEdgeMap) → number[]
```

Standard BFS with `Uint8Array` visited and `Int32Array` parent for O(1) lookups. Edge key: `Math.min(a,b)*10000 + Math.max(a,b)`.

---

## 16. Color Palette & Design System

### Primary Gradient
```
#00D1FF  →  #7B61FF  →  #FF5FB6
  cyan       purple       pink
```

### Node Type Colors
| Type | Color |
|---|---|
| Expert | `#B388FF` |
| Community | `#4FC3F7` |
| New | `#E3F2FD` |
| You | `#FFD54F` |

### Background Colors
| Use | Value |
|---|---|
| Page background | `#02030A` |
| Glass card bg | `rgba(255,255,255,0.03)` |
| Glass card border | `rgba(255,255,255,0.08)` |
| Text muted | `rgba(255,255,255,0.35)` |

### CSS Classes
| Class | Effect |
|---|---|
| `.glass-card` | Glassmorphism panel (`backdrop-filter: blur(20px)`) |
| `.agent-grad` | Gradient text (cyan → purple → pink) |
| `.mono` | JetBrains Mono font |
| `.drift` | Floating particle keyframe animation |
| `.rippleburst` | Click ripple keyframe animation |

### Framer Motion Easing
All page transitions and card animations use: `[0.22, 1, 0.36, 1]`

---

## 17. Key Design Patterns

### 1. Manual Page Routing via State
No React Router. `App.jsx` holds `page` state. `AnimatePresence` plays exit animations before unmount.

### 2. Lazy-Loaded Pages
Six of eight pages use `React.lazy()` + `<Suspense>` for code splitting. Initial bundle only loads `LoginPage` and `SignupPage` eagerly.

### 3. Three.js Scene as Imperative Module
Scene files export factory functions returning an API object. React mounts in `useEffect`, stores in `useRef`, calls methods in response to state changes. The scene owns its own animation loop.

### 4. Callback-Based Scene ↔ React Communication
Scene fires callbacks (`onCoreHover`, `onNodeClick`, etc.). React never polls — it receives events. Scene never accesses React state — it receives commands.

### 5. Seeded Procedural Generation
`xorshift32(seed)` RNG seeded by agent index. Identical output every run = stable network topology. Python backend mirrors this exactly.

### 6. API Boundary
All backend calls go through `src/lib/api.js`. Pages import named functions. This makes endpoint changes a single-file edit.

### 7. Custom GLSL Shaders
Node/line shaders handle per-particle pulse, entry wave reveal, signal glow, BFS path highlighting, and filter masking entirely on the GPU.

### 8. Additive Blending for Glow
`THREE.AdditiveBlending` on all particle systems creates natural glow on the dark background. Bloom pass enhances it further.

### 9. Glassmorphism UI
`backdrop-filter: blur(12–20px)` + `rgba` backgrounds create layered depth against the 3D scene.

---

## 18. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                             App.jsx                                   │
│  state: page, userName, simulationData, simulationKnowledgeCount     │
│  state: chatbotCompleteTarget, bridgePhase, isExiting                │
└──────┬─────────┬──────────┬──────────┬──────────┬───────────────────┘
       │         │          │          │          │
       ▼         ▼          ▼          ▼          ▼
 Onboarding  ChatbotPage  Agentic    Timeline  Community  Runway
   Page                    Web        Page      Page      Page
       │                    │          │
  3D scene.js          3D scene2.js   Shows
  transitionTo()       runSimulation() 3 life paths
  answers              API → simData  from simData
  → handleEnter        → onNavigate
                         Timeline
                              │
                         api.js ──── Backend (FastAPI)
                                         │
                                    SQLite + Azure OpenAI
```

All API calls flow through `src/lib/api.js`. Backend state (user profile, posts, chat history, achievements) persists in SQLite. LLM calls (chatbot, simulation, enhance, file vision) go through Azure OpenAI.
