"""Seed the featured human persona agents into the database.

These six named people (Sudeep, Ramya, Saju, Vinay, Masthan, Geethika) become
real users with knowledge chunks + embedded agent cards, so they show on the
leaderboard and are matchable peers for MENTOR-MATCH / Graph-RAG.

The app also auto-seeds them on startup (see main.py lifespan); run this
manually to (re)seed without booting the server:

    cd backend-python
    python seed_data/seed_personas.py
"""

import os
import sys
import asyncio

# Allow running as a script from the backend-python directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import create_tables                       # noqa: E402
from services.personas import seed_personas        # noqa: E402
from services import embeddings as emb             # noqa: E402


async def main():
    await create_tables()
    n = await seed_personas()
    print(f"Seeded {n} persona agents (embedding backend: {emb.backend_name()}).")


if __name__ == "__main__":
    asyncio.run(main())
