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
