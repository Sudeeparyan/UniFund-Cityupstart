import os
import aiosqlite
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "./unimind.db")

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    focus TEXT,
    goal TEXT,
    fear TEXT,
    agent_bio TEXT DEFAULT '',
    agent_skills TEXT DEFAULT '[]',
    agent_score INTEGER DEFAULT 100,
    onboarding_complete INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    category TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    agent_icon TEXT NOT NULL,
    agent_type INTEGER NOT NULL,
    agent_score INTEGER NOT NULL,
    content TEXT NOT NULL,
    tag TEXT NOT NULL,
    user_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reactions (
    post_id TEXT NOT NULL REFERENCES posts(id),
    emoji TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (post_id, emoji)
);

CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    badge_key TEXT NOT NULL,
    earned_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    call_type TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    status TEXT DEFAULT 'llm',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS simulation_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    chunks_used INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    output_type TEXT DEFAULT 'llm',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS broadcast_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS simulation_evals (
    id                TEXT PRIMARY KEY,
    simulation_log_id TEXT,
    user_id           TEXT,
    user_name         TEXT,
    personalisation   INTEGER,
    groundedness      INTEGER,
    hallucinations    TEXT DEFAULT '[]',
    overall           INTEGER,
    created_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enhance_logs (
    id            TEXT PRIMARY KEY,
    user_id       TEXT,
    original      TEXT,
    flagged       INTEGER DEFAULT 0,
    hallucinations TEXT DEFAULT '[]',
    created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runway_profile (
    user_id         TEXT PRIMARY KEY REFERENCES users(id),
    savings_balance REAL DEFAULT 0,
    updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS runway_income_sources (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    type       TEXT NOT NULL,
    label      TEXT NOT NULL,
    color      TEXT NOT NULL,
    amount     REAL DEFAULT 0,
    active     INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runway_categories (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    label   TEXT NOT NULL,
    spent   REAL DEFAULT 0,
    budget  REAL DEFAULT 0,
    color   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runway_transactions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    date_label TEXT NOT NULL,
    merchant   TEXT NOT NULL,
    category   TEXT NOT NULL,
    color      TEXT NOT NULL,
    amount     REAL NOT NULL,
    ai_tip     TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runway_bank_accounts (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    bank       TEXT NOT NULL,
    type       TEXT NOT NULL,
    last4      TEXT NOT NULL,
    balance    REAL DEFAULT 0,
    accent     TEXT NOT NULL,
    synced_mins INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runway_chart_data (
    user_id           TEXT PRIMARY KEY REFERENCES users(id),
    daily_spend_json  TEXT NOT NULL,
    runway_proj_json  TEXT NOT NULL,
    updated_at        TEXT
);

-- ── AI engine: free retrieval + multi-agent orchestration ──────────────────
-- Per-chunk embedding for free vector retrieval (Graph-RAG candidate set).
CREATE TABLE IF NOT EXISTS chunk_embeddings (
    chunk_id   TEXT PRIMARY KEY REFERENCES knowledge_chunks(id),
    vector     BLOB NOT NULL,
    model      TEXT NOT NULL,
    created_at TEXT
);

-- Rolled-up "agent card" per real user: mini-model summary + card embedding,
-- recomputed in the background when their knowledge changes.
CREATE TABLE IF NOT EXISTS agent_cards (
    user_id     TEXT PRIMARY KEY REFERENCES users(id),
    summary     TEXT,
    skills_json TEXT DEFAULT '[]',
    card_vector BLOB,
    model       TEXT,
    updated_at  TEXT
);

-- Agent-to-agent message log (real A2A primitive).
CREATE TABLE IF NOT EXISTS agent_messages (
    id         TEXT PRIMARY KEY,
    from_agent TEXT NOT NULL,
    to_agent   TEXT NOT NULL,
    user_id    TEXT,
    thread_id  TEXT,
    content    TEXT NOT NULL,
    status     TEXT DEFAULT 'sent',
    created_at TEXT
);

-- Exact-match response cache (repeated expensive calls → €0).
CREATE TABLE IF NOT EXISTS response_cache (
    cache_key     TEXT PRIMARY KEY,
    feature       TEXT NOT NULL,
    user_id       TEXT,
    response_json TEXT NOT NULL,
    created_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_response_cache_user ON response_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_chunk_emb_created ON chunk_embeddings(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_chunks(user_id);
"""


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


DEFAULT_FLAGS = ["simulations", "community", "chatbot", "enhance"]


async def create_tables():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(CREATE_TABLES_SQL)
        # Safe column migrations (ignored if column already exists)
        for sql in [
            "ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN last_active TEXT",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_score INTEGER",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_reason TEXT",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_flags TEXT DEFAULT '[]'",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_status TEXT DEFAULT 'pending'",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_raw_response TEXT",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_user_message TEXT",
            "ALTER TABLE simulation_evals ADD COLUMN raw_response TEXT",
            "ALTER TABLE simulation_evals ADD COLUMN chunks_context TEXT",
            "ALTER TABLE simulation_evals ADD COLUMN simulation_output TEXT",
            "ALTER TABLE enhance_logs ADD COLUMN enhanced_text TEXT",
            "ALTER TABLE enhance_logs ADD COLUMN raw_guard_response TEXT",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_tokens_in INTEGER DEFAULT 0",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_tokens_out INTEGER DEFAULT 0",
            "ALTER TABLE knowledge_chunks ADD COLUMN eval_duration_ms INTEGER DEFAULT 0",
            "ALTER TABLE simulation_evals ADD COLUMN tokens_in INTEGER DEFAULT 0",
            "ALTER TABLE simulation_evals ADD COLUMN tokens_out INTEGER DEFAULT 0",
            "ALTER TABLE simulation_evals ADD COLUMN duration_ms INTEGER DEFAULT 0",
            "ALTER TABLE simulation_evals ADD COLUMN user_prompt TEXT",
            "ALTER TABLE enhance_logs ADD COLUMN tokens_in INTEGER DEFAULT 0",
            "ALTER TABLE enhance_logs ADD COLUMN tokens_out INTEGER DEFAULT 0",
            "ALTER TABLE enhance_logs ADD COLUMN user_prompt TEXT",
        ]:
            try:
                await db.execute(sql)
            except Exception:
                pass
        # Seed default feature flags
        for flag in DEFAULT_FLAGS:
            await db.execute(
                "INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES (?, 1)", (flag,)
            )
        await db.commit()
