# UniFund — "Make It Real" End-to-End Plan (cheapest path)

> **Goal of this document.** The demo in `Script.md` shows four pillars (Runway, Agent Studio, Community Hub, Agentic Web simulator) as a polished story. Today a lot of that story is **UX theatre over scripted data** (see `docs/architecture.md → "Agents: Real vs. Visual"`). This plan is the concrete, phased, *cheapest-possible* path to make each pillar genuinely work — autonomous agents, real agent-to-agent (A2A) collaboration, real Graph RAG, real social-data ingestion — without rewriting the app.
>
> **Cost-first principle (the whole point):** the demo claims the app gets *cheaper per student as it scales*. That's only true if **retrieval is free and LLM calls are rare**. Every design choice below pushes work off the paid LLM and onto: (1) local/open-source embeddings, (2) a local vector+graph store, (3) precomputed agent summaries, (4) aggressive caching, (5) a cheap "mini" model for routine work with the big model used only for final synthesis.

---

## 0. Honest scorecard — claim vs. reality vs. what "real" needs

| Pillar / claim in `Script.md` | Real today | What "real working" requires |
|---|---|---|
| "Agents communicate with each other" (Agentic Web) | 1,401 **static** procedural records; no comms | Persisted per-user agents + a lightweight orchestrator that routes messages between *relevant* agents |
| Agent Studio "connected LinkedIn/YouTube/Twitter/Insta, knows everything" | `SUDEEP_PROFILE` is **hardcoded**; `MCP_TOOLS` are display toggles | Real ingestion (OAuth / export upload / allowed APIs) → chunked → embedded → stored |
| Résumé built by "search agent + prep agent + build agent" | `_build_agent_logs()` is a **hardcoded** script over 3 plain prompt calls | A real router that pulls relevant *other-agent* skills via retrieval, then specialised steps |
| Community "A2A protocol, agents resolve your issue, best agent rewarded" | Static posts + **scripted** A2A badges | A real resolver: post → match relevant agents (embeddings) → candidate answers → score → award |
| Simulator "searches all agents, Graph RAG over thousands of real experiences" | **One** LLM call using only *your own* chunks; no graph, no cross-agent retrieval | Real Graph RAG: cross-user graph + embedding retrieval → grounded synthesis |
| "1,500 students / started with 50 agents" | Seed data + one demo user (Ramya) | Real onboarding + per-user data isolation (today everyone shares one guest account) |
| Runway "AI tracks spending, generates a plan" | **Mostly real already** (AI plan + tips call the backend) | Finish CRUD wiring + real bank data is optional (Plaid/TrueLayer cost money — keep manual/CSV for cheap) |
| "< €100 end-to-end, €0.11 per 10k students" | Plausible *only* with the cost architecture below | Local embeddings + caching + mini-model tiering + free hosting tiers |

**The single most important gap:** there is currently **no per-user data isolation** — the whole app runs on one shared `guest` account. Nothing else ("1,500 agents", "A2A", "Graph RAG") is meaningful until each student is a real, separate, persisted agent. That is Phase 0.

---

## 1. Target architecture (cheapest "real agents" design)

```
                         ┌─────────────────────────────────────────────┐
                         │            FastAPI (existing)               │
   React (existing) ───► │  routers/*  +  NEW: orchestrator service     │
                         └──────────────┬──────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                                ▼
  Embeddings (FREE, local)        Vector + Graph store (FREE, local)   LLM tier
  sentence-transformers           SQLite + sqlite-vec  +  NetworkX     - mini model (cheap): routing,
  bge-small / all-MiniLM          (or FAISS file)                        extraction, eval, scoring
  runs on CPU, €0/token           €0 infra                             - gpt-5-chat (big): final synthesis only
```

**Key idea — "retrieval-first, generate-once."** The multi-agent *experience* (agents conferring, borrowing skills, resolving posts) is produced by: cheap embedding similarity to pick the few relevant agents/chunks (€0), assemble their precomputed summaries, then **one** big-model synthesis call. You keep the visible choreography (`agent_logs` shape unchanged → frontend untouched) but it's now backed by real retrieval instead of a hardcoded list.

**An "agent" becomes a real, persisted object:**
- identity + profile (already in `users`)
- knowledge chunks (already in `knowledge_chunks`)
- **NEW**: an embedding per chunk + one rolled-up "agent card" embedding (capabilities/skills/goals)
- **NEW**: a memory/inbox table for A2A messages
- **NEW**: a deterministic "agent summary" recomputed in the background when chunks change (so synthesis never re-reads raw history)

---

## 2. Cross-cutting foundations (build these once — every pillar reuses them)

### 2.1 Model tiering (biggest cost lever after embeddings)
| Tier | Use for | Cheap choice |
|---|---|---|
| **Free / local** | embeddings, similarity, graph traversal, dedup | `sentence-transformers` (`bge-small-en-v1.5` or `all-MiniLM-L6-v2`) on CPU — €0 per call |
| **Mini LLM** | routing ("which agents are relevant?"), knowledge extraction, chunk eval, A2A scoring, JD parsing | a small Azure deployment (gpt-4o-mini / gpt-5-mini class). ~10–30× cheaper than the big model |
| **Big LLM** | final user-facing synthesis only (résumé, simulation narrative, community answer, runway plan) | existing `gpt-5-chat` |

Implementation: extend `services/azure_openai.py` with a `model` arg (it already has `chat_complete`); add `MINI_DEPLOYMENT` env var. Route ~80% of current LLM calls (extraction, eval, routing) to the mini model. **Note:** today `chat_complete()` silently ignores `temperature` (see `docs/backend.md`) — fix that while you're in there.

### 2.2 Embeddings + vector store (FREE)
- Add `pip install sentence-transformers sqlite-vec` (model downloads once, runs offline on CPU).
- New table `chunk_embeddings(chunk_id, vector)` via `sqlite-vec`; or a single FAISS index file if you prefer.
- Embed on chunk save (in the same `BackgroundTasks` that already runs chunk eval). Zero marginal API cost.
- This makes **all retrieval free** — the foundation of the "cheaper at scale" story.

### 2.3 Graph store (FREE)
- Build an in-memory `networkx` graph nightly (or on write) from `users` + `knowledge_chunks`: nodes = users, edges = shared skill / shared goal / similar-path (cosine ≥ threshold over agent-card embeddings).
- Persist as a pickle/JSON next to the DB. No Neo4j needed at this scale.

### 2.4 Caching (turns repeat questions into €0)
- **Semantic response cache**: hash/embedding of (feature + input) → cached output in a `response_cache` table; serve on cosine ≥ 0.97. Kills duplicate simulations/résumés.
- **Prompt caching**: keep system prompts static and put them first so the provider's prompt cache applies.
- **Precomputed agent summaries**: never feed raw chat history to the big model — feed the cached summary.

### 2.5 Background work + queue (cheap, no extra infra)
- Keep using FastAPI `BackgroundTasks` for now (already used by `eval_service.py`). Only graduate to a real queue (e.g. a single tiny worker + SQLite-backed queue, or Redis free tier) if A2A volume grows.

### 2.6 Observability (already half-built — reuse it)
- You already log every LLM call to `llm_logs` with tokens/latency/fallback and surface it in the Developer plane. Extend `call_type` for the new flows (`a2a_resolve`, `sim_graphrag`, `embed`=free). This *is* your cost dashboard — it directly backs the "€X per 10k students" claim with real data.

---

## 3. Pillar-by-pillar implementation

### Phase 0 — Real agents foundation (prerequisite for everything)
**Why first:** without per-user identity, "1,500 agents talking" is impossible.
1. **Wire real auth** — the `LoginPage`/`SignupPage` already exist and the backend `/api/auth/{signup,login}` work; route them in `App.jsx`. Keep guest as a *trial* that can upgrade to a real account.
2. **Per-user isolation** — every query already filters by `user_id`; the only fix is making each browser a distinct user instead of the shared guest row. (GDPR: see §6.)
3. **Agent persistence layer** — add `chunk_embeddings`, `agent_cards(user_id, summary, skills_json, card_vector, updated_at)`, `agent_messages(id, from_user, to_user, thread_id, content, status, created_at)`, `response_cache`.
4. **Background "rebuild agent card"** — on chunk change, recompute summary (mini model, cached) + card embedding (local, free). Reuse the existing chunk-eval background hook.

**Deliverable:** real, separable agents with free retrieval. Frontend largely unchanged.

---

### Phase 1 — Agentic Web: real agents + real (cheap) communication
- Inject **real user agents** into the network alongside the procedural seed (the seed can stay as "ambient population" to keep the web looking full — be transparent internally that they're decoration).
- **Real A2A primitive**: `orchestrator.route(query, k)` → embed query (free) → top-k relevant agents by card-vector cosine (free) → return their summaries. This one function powers Studio, Community, and the Simulator.
- The visible "agents communicating" animation keeps consuming the same `logs`/`statuses` shape — but now the entries are generated from *real* routed agents + (optionally) one mini-model "what would this agent contribute?" line, not `_build_agent_logs()`.

**Cost:** ~€0 (retrieval) + optional 1 mini call.

---

### Phase 2 — Agent Studio: real ingestion + real task agents
**2a. Real knowledge ingestion (replace hardcoded `SUDEEP_PROFILE`).** Be realistic about each source's cost/legality:
| Source | Cheapest *real* path | Reality check |
|---|---|---|
| Résumé / docs | already real (`/api/chatbot/upload`) — keep | ✅ works now |
| LinkedIn | **user-initiated data export upload** (LinkedIn lets users download their data as a ZIP) → parse | LinkedIn has **no cheap public profile API**; scraping violates ToS. Export-upload is the honest, free path. |
| YouTube | YouTube Data API (free quota) for the user's own liked/history via OAuth | free tier is enough at student scale |
| Twitter/X | X API is now expensive — **defer** or accept paste/upload | be honest: skip until funded |
| GitHub | free REST API + OAuth | cheap & real, high-signal for devs |
| Generic | paste / upload (already real) | fallback for everything |

→ Each ingested item flows through the *existing* chunk pipeline (extract → store → embed → eval). "MCP tools" become real connectors that produce chunks, instead of UI toggles. Level (BABY→MAX) then reflects **real** chunk count/quality, not a slider.

**2b. Real résumé pipeline (replace `_build_agent_logs()`).** Keep the 3 LLM steps you have (JD analyze → match → build) but make the "borrows skills from other agents" real:
- After JD analysis, `orchestrator.route(jd_skills, k=5)` finds *other users'* agent cards strong in the required skills (free retrieval).
- Feed those summaries into the match/build steps as "expert context."
- Emit `agent_logs` from the actual routed agents. The choreography is now backed by real data; cost is still ~3 calls (1 mini + 2 big, or all mini except final build).

---

### Phase 3 — Community Hub: real A2A resolution + scoring
Turn the scripted A2A badges into a real resolver:
1. User/agent posts a problem (existing `posts`).
2. `orchestrator.route(post, k)` selects the few agents whose cards match (free).
3. Each selected agent drafts a candidate answer — **mini model**, run as background tasks, cached.
4. A **judge** (mini model, one call) scores candidates for relevance/correctness; best answer is posted as the resolution and its owner's `agent_score` increments (you already have scoring + reactions plumbing).
5. The "agents talking" feed now reflects real candidate generation + judging.

**Cost control:** cap `k` (e.g. 3 agents), debounce, cache by post embedding, and only escalate to the big model if the judge's confidence is low. Most posts resolve for a few mini-model calls.

---

### Phase 4 — Web Simulator: real Graph RAG (the headline feature)
Replace the single self-only LLM call in `simulate_router.py` with real Graph RAG:
1. Embed the user's goal/query (free).
2. **Graph traversal** (free, NetworkX): from the user node, walk to others with similar goals/paths/skills; collect their *outcome* chunks (e.g., "got X internship after Y").
3. **Vector rerank** (free) the collected chunks to the query; take top-N.
4. **One** big-model synthesis grounded in those real experiences → probabilities, companies hiring, skills to focus, "how people like you succeeded."
5. Keep the existing fallback template; keep logging to `simulation_logs` + the Pipeline-2 eval that already checks groundedness/hallucination.

**This is what makes the answer "better than generic ChatGPT" truthfully** — it's grounded in retrieved peer outcomes, not vibes. Cost: ~€0 retrieval + 1 synthesis call, cached.

---

### Runway — finish, don't rebuild
Already the most-real pillar (AI plan + tips hit the backend). To complete:
- Wire the existing `runway_*` CRUD endpoints to the page (income/categories/transactions/accounts already exist + seeded for Ramya).
- **Keep bank linking cheap:** real aggregation (Plaid/TrueLayer/Nordigen) has per-call or per-connection cost. For "cheapest," default to **manual entry + CSV import**; offer Nordigen/GoCardless (free tier for EU banks) as an optional upgrade later.

---

## 4. Phased roadmap (with exit criteria)

| Phase | Scope | Exit criteria | Est. effort |
|---|---|---|---|
| **P0** Foundation | real auth + isolation, embeddings, vector+graph store, agent cards, caching, model tiering | A new signup creates an isolated agent; chunks get embedded for free; `orchestrator.route()` returns real relevant agents | 1–2 wks |
| **P1** Agentic Web comms | real agents in network + A2A primitive | Web shows real agents; routing demoable | 3–5 days |
| **P2** Agent Studio real | ≥2 real connectors (upload+GitHub), résumé pipeline backed by real retrieval | Level reflects real data; résumé cites real peer skills | 1–2 wks |
| **P3** Community A2A | real resolve + judge + scoring | A posted problem gets a real, scored, awarded answer | 1 wk |
| **P4** Simulator Graph RAG | graph traversal + grounded synthesis | Simulation cites retrieved peer outcomes; Pipeline-2 groundedness ↑ | 1–2 wks |
| **P5** Polish | Runway CRUD wiring, cost dashboard, caching tuning | Dev plane shows real €/10k from `llm_logs` | ongoing |

Ship in this order because each phase unblocks the next (P0 → everything; P1 primitive → P2/P3/P4 all reuse it).

---

## 5. Cost model — how to actually hit "cheap" (and an honest version of the pitch numbers)

**Where cost goes to ~0:**
- Embeddings & all retrieval: **€0** (local CPU model).
- Graph build/traversal: **€0**.
- Cached repeats: **€0**.
- Routine LLM work moved to **mini model**: ~10–30× cheaper.
- Hosting on free tiers: frontend (Vercel/Cloudflare Pages free), backend (Fly.io/Render free or a €5/mo VPS), SQLite file = €0 DB.

**Per-action rough cost (order-of-magnitude, verify against current Azure pricing):**
| Action | LLM calls | Tier | Notes |
|---|---|---|---|
| Chat turn | 1 reply + 1 extract | big + mini | extract → mini |
| Chunk embed/eval | 0 + 1 | free + mini | embed is free |
| Résumé | ~3 | 1 mini + 2 big | retrieval free |
| Community resolve | 3–4 | mini + 1 judge | capped & cached |
| Simulation (Graph RAG) | 1 | big | retrieval free, cached |

**Reality check on the script's numbers.** "< €100 to build end-to-end" is believable *if* you used free tiers + your own time + small eval/finetune spend. "€0.11 per 10k students" is only defensible as a **marginal-cost** figure for *cached/retrieval-heavy* actions where the LLM rarely fires — not for 10k students each running uncached big-model simulations. **Recommendation:** state it honestly as *"marginal cost approaches ~€0 for retrieval-served actions; LLM-synthesis actions cost ~€X each, mostly cached"* and let the real `llm_logs` dashboard prove the number. The Developer plane already computes today's tokens/cost — wire that into the pitch instead of a static figure.

**Spend controls to add:** per-user daily LLM budget, global kill-switch via the existing `feature_flags`, cache-before-call everywhere, mini-first with big-model escalation only on low confidence.

---

## 6. Risks & honest caveats (do not skip)

- **GDPR (you target EU/Ireland students).** Ingesting LinkedIn/YouTube/social data + cross-user retrieval = personal data processing. Required: explicit consent per source, data-export/delete endpoints, a lawful basis, and **don't** expose one user's raw chunks to another (retrieval should surface *derived summaries/outcomes*, not verbatim private text). The current shared-guest model is also a privacy problem — fix in P0.
- **Social ingestion legality.** LinkedIn/X scraping breaks ToS and risks bans; the cheapest *legal* path is user-initiated export upload + official OAuth APIs. Don't promise "it reads all your LinkedIn automatically."
- **"1,500 real agents / thousands of experiences."** Until real users exist, the graph is sparse. Be clear internally that seed agents are ambient decoration; Graph RAG quality scales with real adoption (which is also the honest version of "cheaper/smarter as more join").
- **Quality of cheap retrieval.** Local embeddings are good but not SOTA; budget time to tune thresholds and rerank. Keep the big model for final synthesis so output quality stays high.
- **Cost cache invalidation.** Semantic cache must invalidate when a user's chunks change, or you'll serve stale résumés/sims.

---

## 7. Definition of done (per pillar)

- **Agentic Web:** a brand-new user appears as a real, isolated agent; `orchestrator.route()` returns relevant *real* peers; comms animation is backed by routed agents.
- **Agent Studio:** ≥2 real ingestion sources feed the chunk pipeline; agent level reflects real chunk count/quality; résumé pipeline cites real retrieved peer skills; `.doc` downloads.
- **Community Hub:** posting a problem triggers real candidate answers + a judged winner + an awarded score, all logged.
- **Simulator:** simulation output is grounded in retrieved peer outcomes (Pipeline-2 groundedness score rises vs. today); falls back gracefully.
- **Runway:** CRUD wired to UI; AI plan/tips real (already); optional cheap bank import.
- **Cost:** Developer plane shows real per-action and per-10k-user cost from `llm_logs`; >70% of actions served by free retrieval or cache or mini model.

---

## 8. First 5 concrete tickets (start here)

1. **P0-1**: add `sentence-transformers` + `sqlite-vec`; create `chunk_embeddings`; embed on chunk save (extend the existing eval `BackgroundTasks`).
2. **P0-2**: add `MINI_DEPLOYMENT` to `azure_openai.py`, add `model`/`temperature` params (and fix the ignored-temperature bug); move `extract_knowledge`, chunk eval, JD parse to mini.
3. **P0-3**: add `agent_cards` + background rebuild (mini summary + free card embedding) on chunk change.
4. **P0-4**: implement `services/orchestrator.py` with `route(query, k)` (embed → cosine top-k over `agent_cards`).
5. **P0-5**: route real auth (`LoginPage`/`SignupPage`) in `App.jsx`; make guest an upgradable trial → per-user isolation.

Everything in Phases 1–4 reuses tickets 1, 3, and 4. Build the foundation once; the "real agents" experience falls out of it cheaply.
