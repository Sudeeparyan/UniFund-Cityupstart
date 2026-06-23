"""Generate synthetic student-survey agents and seed them.

Writes the raw synthetic survey data to `seed_data/student_agents.json` (the
JSON proof) and seeds the agents into the database (real users + embedded
cards). Run:

    cd backend-python
    python seed_data/generate_students.py            # 485 students, write JSON + seed
    python seed_data/generate_students.py 1000        # custom count
    python seed_data/generate_students.py 485 --no-seed   # only write the JSON

Set EMBED_BACKEND=hash for an instant offline seed; the default uses free local
sentence-transformers embeddings (higher quality, one model pass).
"""

import os
import sys
import json
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import create_tables                                   # noqa: E402
from services import embeddings as emb                         # noqa: E402
from services.student_seed import generate_students, seed_students  # noqa: E402

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "student_agents.json")


def _summary(records: list[dict]) -> dict:
    def dist(key_path):
        out = {}
        for r in records:
            v = r
            for k in key_path:
                v = v[k]
            out[v] = out.get(v, 0) + 1
        return dict(sorted(out.items(), key=lambda x: -x[1]))
    return {
        "total": len(records),
        "by_country": dist(["country"]),
        "by_level": dist(["survey", "what_best_describes_you"]),
        "finance_worry": dist(["survey", "finance_worry_frequency"]),
        "feature_interest": dist(["survey", "feature_interest"]),
    }


async def main():
    n = 485
    do_seed = True
    for arg in sys.argv[1:]:
        if arg == "--no-seed":
            do_seed = False
        elif arg.isdigit():
            n = int(arg)

    records = generate_students(n)

    payload = {
        "generated": n,
        "note": "Synthetic international-student survey responses + derived agents.",
        "summary": _summary(records),
        "students": records,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"Wrote {n} synthetic student records -> {OUT_PATH}")
    print("Summary:", json.dumps(payload["summary"], ensure_ascii=False))

    if do_seed:
        await create_tables()
        stats = await seed_students(records)
        print("Seeded:", json.dumps(stats, ensure_ascii=False))
    else:
        print("Skipped seeding (--no-seed).")


if __name__ == "__main__":
    asyncio.run(main())
