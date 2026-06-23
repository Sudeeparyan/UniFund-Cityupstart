"""Featured human personas — real, network-functional agents.

These six are the named people on the leaderboard. Unlike the procedural
`agent_seed` codenames (ARIA/NOX/…), these are seeded into the database as real
users with knowledge chunks + an embedded agent card, so they are:
  • shown on the leaderboard (real names + scores)
  • matchable peers for MENTOR-MATCH (`orchestrator.route_peers`)
  • part of the Graph-RAG corpus (their outcomes ground simulations)

Seeding is fully offline & free: chunk + card embeddings are local, and the
agent-card summary uses the persona's own bio (no LLM call needed).
"""

import json
from datetime import datetime, timezone

import aiosqlite

from db import DB_PATH
from services import embeddings as emb

# category ∈ {skill, experience, goal, fear, general}
PERSONAS = [
    {
        "slug": "sudeep",
        "name": "Sudeep Aryan",
        "title": "Founder",
        "type": 0,
        "icon": "🚀",
        "score": 14280,
        "focus": "Building an AI startup",
        "goal": "Build an AI company that reaches product-market fit and scale",
        "fear": "Running out of runway before the product lands",
        "bio": "Founder building UniMind — agentic AI for life simulation. MSc AI "
               "at National College of Ireland. Ships full-stack AI products end "
               "to end and leads from the front.",
        "skills": ["Python", "Azure OpenAI", "FastAPI", "React", "Machine Learning",
                   "Computer Vision", "RAG", "Leadership"],
        "chunks": [
            ("experience", "Founded UniMind, an agentic AI platform that builds a personal AI agent from each user's knowledge and runs life simulations."),
            ("experience", "Completed an MSc in Artificial Intelligence at National College of Ireland, Dublin."),
            ("experience", "Interned at Vially building production ML features, and led work on a $1M Texas Instruments contract at Soliton."),
            ("experience", "Won IEEE Best Paper 2025 for applied AI research."),
            ("skill", "Builds full-stack AI apps: FastAPI + SQLite backends, React + Three.js frontends, Azure OpenAI and local-embedding RAG pipelines."),
            ("goal", "Turn UniMind into a funded company with real users and a defensible collective-intelligence moat."),
        ],
    },
    {
        "slug": "ramya",
        "name": "Ramya",
        "title": "AI Explorer",
        "type": 1,
        "icon": "🔮",
        "score": 12500,
        "focus": "Exploring AI and landing an AI role",
        "goal": "Become an AI engineer working on real LLM products",
        "fear": "Not being technical enough to keep up",
        "bio": "AI explorer turning curiosity into shipped projects — chatbots, "
               "agents, and data tools. Learns fast and builds in public.",
        "skills": ["Python", "Prompt Engineering", "LangChain", "Hugging Face",
                   "Data Analysis", "RAG"],
        "chunks": [
            ("experience", "Built several LLM chatbots and retrieval agents while learning, and shares progress in public."),
            ("skill", "Comfortable with prompt engineering, LangChain, and Hugging Face models for quick prototypes."),
            ("goal", "Land a first AI-engineer role on a team shipping LLM features."),
            ("fear", "Worries about the gap between tutorials and real production engineering."),
            ("experience", "Completed multiple data-analysis projects turning messy datasets into clear insights."),
        ],
    },
    {
        "slug": "saju",
        "name": "Saju",
        "title": "Builder",
        "type": 2,
        "icon": "🔨",
        "score": 11800,
        "focus": "Building and launching products",
        "goal": "Launch a profitable SaaS product as an indie builder",
        "fear": "Building something nobody wants",
        "bio": "Indie builder who ships fast — full-stack web apps from idea to "
               "deploy. Obsessed with shipping and iterating on real feedback.",
        "skills": ["React", "Node.js", "PostgreSQL", "TypeScript", "DevOps",
                   "Product", "UI/UX"],
        "chunks": [
            ("experience", "Shipped three side projects solo, taking each from idea to deployed product with real users."),
            ("skill", "Full-stack: React/TypeScript front ends, Node + PostgreSQL back ends, CI/CD and cloud deploys."),
            ("goal", "Grow one product to consistent monthly revenue and go full-time indie."),
            ("experience", "Did freelance development work building MVPs for early founders."),
        ],
    },
    {
        "slug": "vinay",
        "name": "Vinay",
        "title": "Student",
        "type": 3,
        "icon": "🎯",
        "score": 11200,
        "focus": "Cracking a SWE internship",
        "goal": "Land a software-engineering internship at a top company",
        "fear": "Freezing in technical interviews",
        "bio": "CS student grinding data structures and system-design "
               "fundamentals to break into top-tier software engineering.",
        "skills": ["Data Structures & Algorithms", "Java", "C++",
                   "System Design", "Competitive Programming"],
        "chunks": [
            ("experience", "Solved 500+ algorithm problems and competes in programming contests."),
            ("skill", "Strong in DSA with Java and C++, and the basics of scalable system design."),
            ("goal", "Convert internship interviews at top product companies into a return offer."),
            ("fear", "Gets nervous and blanks during live coding interviews."),
        ],
    },
    {
        "slug": "masthan",
        "name": "Masthan",
        "title": "Student",
        "type": 3,
        "icon": "📊",
        "score": 10600,
        "focus": "Learning data science",
        "goal": "Get into a strong AI master's or a data-science role",
        "fear": "Choosing the wrong specialisation",
        "bio": "Final-year student going deep on data science and machine "
               "learning through Kaggle and a capstone research project.",
        "skills": ["Python", "Pandas", "SQL", "Machine Learning", "Statistics",
                   "Data Visualisation"],
        "chunks": [
            ("experience", "Competes on Kaggle and built an ML capstone project for his final undergraduate year."),
            ("skill", "Handles the full data pipeline: cleaning in Pandas, SQL queries, modelling, and clear visualisation."),
            ("goal", "Get accepted into a strong AI master's programme or a data-science graduate role."),
        ],
    },
    {
        "slug": "geethika",
        "name": "Geethika",
        "title": "Rising Star",
        "type": 4,
        "icon": "🌟",
        "score": 10100,
        "focus": "Frontend & product design",
        "goal": "Become a product designer / frontend engineer at a great team",
        "fear": "Being seen as 'just' a designer, not technical",
        "bio": "Rising-star designer-developer hybrid — turns ideas into "
               "beautiful, usable product UIs and learns the engineering to ship "
               "them herself.",
        "skills": ["Figma", "React", "Tailwind CSS", "UX Design", "Branding",
                   "Design Systems"],
        "chunks": [
            ("experience", "Designed and built polished app interfaces and won a student hackathon for product design."),
            ("skill", "Bridges design and code: Figma prototypes plus React + Tailwind implementation."),
            ("goal", "Join a product team as a designer-engineer hybrid shipping real features."),
            ("fear", "Wants to be taken seriously as technical, not pigeonholed as only visual."),
        ],
    },
]

PERSONA_IDS = {p["slug"]: f"persona-{p['slug']}" for p in PERSONAS}
PERSONA_NAMES = [p["name"] for p in PERSONAS]


def is_persona_placeholder(full_name: str) -> bool:
    """True if a procedural-seed agent's full_name corresponds to one of our
    real personas (so we can drop the hollow placeholder in favour of the
    functional persona). Matches e.g. 'Masthan · Student' → persona 'Masthan'."""
    fn = (full_name or "").strip().lower()
    return any(fn.startswith(name.lower()) for name in PERSONA_NAMES)


def featured_leaderboard() -> list[dict]:
    """Static display rows for the leaderboard (no DB needed)."""
    rows = []
    for p in PERSONAS:
        rows.append({
            "idx": -1,
            "name": p["name"],
            "full_name": p["name"],
            "icon": p["icon"],
            "score": p["score"],
            "type": p["type"],
            "title": p["title"],
            "featured": True,
        })
    return rows


async def seed_personas() -> int:
    """Insert/refresh the personas as real users + chunks + embedded agent cards.
    Idempotent and offline (no LLM). Returns the number of personas seeded."""
    backend = emb.backend_name()
    now = datetime.now(timezone.utc).isoformat()

    # bcrypt hash is slow; compute one shared hash for all personas.
    try:
        from auth import hash_password
        pw = hash_password("__persona__")
    except Exception:
        pw = "x"

    async with aiosqlite.connect(DB_PATH) as db:
        for p in PERSONAS:
            uid = PERSONA_IDS[p["slug"]]
            email = f"{p['slug']}@unimind.network"
            await db.execute(
                "INSERT OR IGNORE INTO users (id,email,password_hash,name,created_at,"
                "focus,goal,fear,agent_bio,agent_skills,agent_score,onboarding_complete)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,1)",
                (uid, email, pw, p["name"], now, p["focus"], p["goal"], p["fear"],
                 p["bio"], json.dumps(p["skills"]), p["score"]),
            )
            # Keep score/bio fresh on re-seed without disturbing other columns.
            await db.execute(
                "UPDATE users SET agent_bio=?, agent_skills=?, agent_score=?,"
                " focus=?, goal=?, fear=? WHERE id=?",
                (p["bio"], json.dumps(p["skills"]), p["score"],
                 p["focus"], p["goal"], p["fear"], uid),
            )

            # Knowledge chunks (skip if this persona already has them).
            cur = await db.execute(
                "SELECT COUNT(*) FROM knowledge_chunks WHERE user_id=?", (uid,)
            )
            (have,) = await cur.fetchone()
            if not have:
                for cat, content in p["chunks"]:
                    chunk_id = f"{uid}-{abs(hash(content)) % 10_000_000}"
                    await db.execute(
                        "INSERT OR IGNORE INTO knowledge_chunks (id,user_id,content,category,created_at)"
                        " VALUES (?,?,?,?,?)",
                        (chunk_id, uid, content, cat, now),
                    )
                    vec = await emb.embed(content)
                    await db.execute(
                        "INSERT OR REPLACE INTO chunk_embeddings (chunk_id,vector,model,created_at)"
                        " VALUES (?,?,?,?)",
                        (chunk_id, emb.to_blob(vec), backend, now),
                    )

            # Agent card (summary = bio, no LLM needed).
            card_text = f"{p['bio']} Skills: {', '.join(p['skills'])}."
            card_vec = await emb.embed(card_text)
            await db.execute(
                "INSERT OR REPLACE INTO agent_cards (user_id,summary,skills_json,card_vector,model,updated_at)"
                " VALUES (?,?,?,?,?,?)",
                (uid, p["bio"], json.dumps(p["skills"]), emb.to_blob(card_vec), backend, now),
            )
        await db.commit()
    return len(PERSONAS)
