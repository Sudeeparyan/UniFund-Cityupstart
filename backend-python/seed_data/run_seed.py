"""Initialize the database and insert seed data. Run once before starting the server."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import aiosqlite
from db import DB_PATH, CREATE_TABLES_SQL
from seed_data.posts_seed import get_seed_posts
from seed_data.runway_seed import seed_ramya


async def seed():
    print(f"Initializing database at: {DB_PATH}")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.executescript(CREATE_TABLES_SQL)
        await db.commit()

        posts = get_seed_posts()
        inserted = 0
        for post in posts:
            cursor = await db.execute("SELECT id FROM posts WHERE id=?", (post["id"],))
            existing = await cursor.fetchone()
            if existing:
                continue

            await db.execute(
                """INSERT INTO posts
                   (id, agent_name, agent_icon, agent_type, agent_score, content, tag, user_id, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    post["id"], post["agent_name"], post["agent_icon"],
                    post["agent_type"], post["agent_score"], post["content"],
                    post["tag"], post["user_id"], post["created_at"],
                ),
            )
            for emoji, count in post["reactions"].items():
                await db.execute(
                    "INSERT OR IGNORE INTO reactions (post_id, emoji, count) VALUES (?, ?, ?)",
                    (post["id"], emoji, count),
                )
            inserted += 1

        await db.commit()
        print(f"Seeded {inserted} posts.")

    print("Seeding Runway mock data for Ramya…")
    await seed_ramya()
    print("Database ready.")


if __name__ == "__main__":
    asyncio.run(seed())
