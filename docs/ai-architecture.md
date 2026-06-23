# UniMind — AI Engine v2 (fast · accurate · cheap)

This document describes the multi-tier AI architecture added on **2026-06-22**.
It implements **Phase 0 + the headline pieces of P1/P2/P4** from
[`make-it-real-plan.md`](make-it-real-plan.md): model tiering, free local
retrieval, a real expert-agent council, Graph-RAG simulation, and caching.

> **Design principle — "retrieve free, generate once."** Every retrieval
> (expert routing, peer lookup, Graph-RAG) runs on free local embeddings.
> Routine LLM work runs on a cheap **mini** model. The expensive **big** model
> fires only for the single final synthesis — and that result is cached.

---

## The three tiers

| Tier | What runs here | Cost | Where |
|---|---|---|---|
| **Free / local** | embeddings, cosine similarity, expert routing, peer/Graph-RAG retrieval, agent-card vectors | **€0** | `services/embeddings.py` |
| **Mini LLM** | knowledge extraction, all 3 eval pipelines, JD analysis, per-expert drafts, agent-card summaries | ~10–30× cheaper than big | `chat_complete(..., mini=True)` |
| **Big LLM** | final user-facing synthesis only (chat reply, council answer, simulation narrative, résumé build) | full price, **cached** | `chat_complete(...)` |

### Configuring the tiers (`backend-python/.env`)
```
DEPLOYMENT_NAME=gpt-5-chat          # BIG model (existing)
MINI_DEPLOYMENT=gpt-5-mini          # NEW — cheap tier. Defaults to BIG if unset.
EMBED_BACKEND=auto                  # auto | st | hash   (default auto)
EMBED_MODEL=all-MiniLM-L6-v2        # sentence-transformers model
LLM_SUPPORTS_TEMPERATURE=1          # set 0 if your deployment 400s on temperature
```
**Nothing breaks if you don't set these.** Without `MINI_DEPLOYMENT`, the mini
tier transparently uses the big model (correct, just not cheaper). Without
`sentence-transformers` installed (or with `EMBED_BACKEND=hash`), embeddings
fall back to a deterministic hash — still €0, lower semantic quality.

---

## Components

### `services/embeddings.py` — free retrieval foundation
- `embed(text)` / `embed_batch(texts)` → L2-normalised 384-dim vectors (async, off the event loop).
- Backend auto-detected once: **sentence-transformers** (preferred, free, CPU) → **deterministic hashing** (always works offline).
- `cosine`, `top_k`, `to_blob`/`from_blob` (SQLite BLOB storage), `backend_name()` (tagged on every stored vector so we never mix vector spaces).

### `services/expert_agents.py` — the real experts
**13 routable specialist personas** (+ ARIA orchestrator) and **4 special-purpose
agents**, each with a domain description (used for embedding routing), keywords
(routing boost), and a system prompt. Add an expert by appending one dict —
routing/council/UI pick it up automatically.

| id | specialty |
|---|---|
| SCOUT | Opportunity hunter (jobs, hiring, timing) |
| LENS | Skills-gap analyst |
| VEDA | Research & learning mentor |
| NOX | Risk & reality-check |
| ABACUS | Finance & runway coach |
| FORGE | Builder & execution coach |
| RESUME | Personal-brand & applications |
| NEXUS | Peer-paths analyst |
| ORION | Long-term vision strategist |
| LUME | Wellbeing & motivation coach |
| ATLAS | Relocation & visa strategist |
| QUANT | Calibrated forecaster (base rates / odds) |
| CATALYST | Accountability & momentum |

**`SPECIAL_AGENTS`** (not randomly routed — power dedicated flows): **SENTINEL**
(fact-check guardrail), **ECHO** (your future-self, 5 years ahead), **ADVOCATE** +
**SKEPTIC** (the debate pair behind `run_debate`).

### `services/personas.py` — featured human agents
Six named people (Sudeep·Founder, Ramya·AI Explorer, Saju·Builder, Vinay·Student,
Masthan·Student, Geethika·Rising Star) seeded as **real users + knowledge chunks
+ embedded agent cards** (`seed_personas()`, idempotent & offline). They top the
leaderboard *and* become matchable peers for MENTOR-MATCH / Graph-RAG — replacing
the old hollow `agent_seed` placeholders (deduped in `/api/leaderboard`).

### `services/orchestrator.py` — the multi-agent brain
- `route_experts(query, k)` — top-k experts by embedding similarity + keyword boost (**free**).
- `run_council(...)` — route → run the chosen experts **in parallel on the mini tier** → fuse with **one** big-model synthesis. Returns `{answer, confidence, experts[], agent_logs[], usage}`. `agent_logs` match the existing SpaceArena shape, so the "agents communicating" animation is now backed by real reasoning.
- `route_peers(...)` — top-k similar real users by agent-card vector (**free**).
- `graph_rag_context(...)` — retrieve real peer *outcome* chunks relevant to a query (**free**) for grounded simulation.
- `embed_and_store_chunk(...)`, `rebuild_agent_card(...)` — background builders (chunk embedding = free; card summary = 1 mini call) triggered when a user's knowledge changes.

### `services/llm_cache.py` — €0 repeats
Exact-match cache keyed by a hash of `(feature + user + all inputs)`. It is
deliberately exact-match so it can never serve a stale result — when a user's
chunks change, the key changes and `cache_invalidate_user` clears their rows.

---

## New database tables
| Table | Purpose |
|---|---|
| `chunk_embeddings(chunk_id, vector, model, created_at)` | free vector retrieval / Graph-RAG candidate set |
| `agent_cards(user_id, summary, skills_json, card_vector, model, updated_at)` | per-user rolled-up agent identity + embedding |
| `agent_messages(...)` | real A2A message log primitive |
| `response_cache(cache_key, feature, user_id, response_json, created_at)` | exact-match response cache |
Plus new indexes on `response_cache`, `chunk_embeddings`, `llm_logs`, `knowledge_chunks`.

---

## Where it's wired
| Flow | Change |
|---|---|
| `POST /api/agent/council` (**new**) | full expert council; `GET /api/agent/experts` lists the roster (+ special) |
| `POST /api/agent/debate` (**new**) | ADVOCATE vs SKEPTIC → ARIA judge (higher-accuracy decisions) |
| `GET /api/agent/mentors` (**new**) | MENTOR-MATCH — real network agents most similar to you |
| `GET /api/agent/network` (**new**) | the featured human persona agents |
| `POST /api/simulate` | Graph-RAG peer grounding + exact-match cache; response now has a `grounding` block |
| `POST /api/studio/run` | JD analysis + match on mini; real peer retrieval feeds the agent logs (`peers_consulted`) |
| `POST /api/chatbot/message`, `/knowledge` | extraction on mini; background chunk-embed + agent-card rebuild; cache invalidation |
| eval pipelines (chunk / sim / enhance) | all moved to the mini tier |
| `chat_complete()` | `model`/`mini` params; **temperature now actually forwarded** (auto-disables if a deployment rejects it) |

`frontend-react/src/lib/api.js` gained `runAgentCouncil(query, k)` and `getExperts()`.

---

## Cost & observability
Every LLM call still logs to `llm_logs` (now with `call_type` = `council_expert`,
`council_synth`, etc. and `status` = `mini`/`llm`/`fallback`). Retrieval is free
and not logged. The existing Developer plane is therefore the real cost
dashboard — it can show the mini-vs-big split that backs the "cheaper at scale"
claim. To realise the savings in production: set `MINI_DEPLOYMENT` to a cheap
deployment and keep `sentence-transformers` installed.

## Honest limits
- **Graph-RAG quality scales with adoption.** With few real users the peer graph
  is sparse and simulation grounding degrades gracefully to the model's own
  reasoning (the `grounding.grounded` flag tells you which happened).
- **Per-user isolation is still pending** (the app runs on a shared guest
  account — see `make-it-real-plan.md` P0). Agent cards/embeddings are correct
  per `user_id`, so this lights up the moment real auth is routed.
