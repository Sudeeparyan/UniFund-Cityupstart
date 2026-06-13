"""Seed Ramya's account with realistic UniFund/Runway mock data.
Run as part of run_seed.py. Safe to call multiple times (idempotent).
"""
import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import aiosqlite
from db import DB_PATH
from auth import hash_password

RAMYA_ID    = "ramya-seed-001"
RAMYA_EMAIL = "ramya@unimind.dev"
RAMYA_PASS  = "ramya2025"
RAMYA_NAME  = "Ramya"

# ── Income sources ────────────────────────────────────────────────────────────

INCOME_SOURCES = [
    {
        "id": "ramya-inc-1",
        "type": "salary",
        "label": "MSc Research Stipend",
        "color": "#69F0AE",
        "amount": 1200.0,
        "active": 1,
        "created_at": "2026-05-01T00:00:00+00:00",
    },
    {
        "id": "ramya-inc-2",
        "type": "freelance",
        "label": "React Tutoring",
        "color": "#00D1FF",
        "amount": 0.0,
        "active": 0,
        "created_at": "2026-05-01T00:01:00+00:00",
    },
    {
        "id": "ramya-inc-3",
        "type": "side_project",
        "label": "Side Project Revenue",
        "color": "#7B61FF",
        "amount": 0.0,
        "active": 0,
        "created_at": "2026-05-01T00:02:00+00:00",
    },
]

# ── Spending categories ───────────────────────────────────────────────────────

CATEGORIES = [
    {"id": "ramya-cat-rent",      "label": "Rent & Housing",    "spent": 520,  "budget": 520,  "color": "#7B61FF"},
    {"id": "ramya-cat-groceries", "label": "Groceries",         "spent": 180,  "budget": 200,  "color": "#00D1FF"},
    {"id": "ramya-cat-cloud",     "label": "Cloud & Infra",     "spent": 45,   "budget": 60,   "color": "#4FC3F7"},
    {"id": "ramya-cat-devtools",  "label": "Dev Tools",         "spent": 38,   "budget": 50,   "color": "#B388FF"},
    {"id": "ramya-cat-ai",        "label": "SaaS & AI Tools",   "spent": 42,   "budget": 40,   "color": "#FF5FB6"},
    {"id": "ramya-cat-learning",  "label": "Learning",          "spent": 29,   "budget": 40,   "color": "#FFD54F"},
    {"id": "ramya-cat-domains",   "label": "Domains & Hosting", "spent": 15,   "budget": 20,   "color": "#00D1FF"},
    {"id": "ramya-cat-transport", "label": "Transport",         "spent": 89,   "budget": 100,  "color": "#4FC3F7"},
    {"id": "ramya-cat-food",      "label": "Eating Out",        "spent": 95,   "budget": 80,   "color": "#FF8A65"},
    {"id": "ramya-cat-health",    "label": "Health",            "spent": 28,   "budget": 60,   "color": "#69F0AE"},
    {"id": "ramya-cat-hardware",  "label": "Hardware",          "spent": 42,   "budget": 30,   "color": "#B388FF"},
]

# ── Transactions ──────────────────────────────────────────────────────────────

TRANSACTIONS = [
    {
        "id": "ramya-txn-01",
        "date_label": "Today",
        "merchant": "Lidl",
        "category": "Groceries",
        "color": "#F59E0B",
        "amount": -34.20,
        "ai_tip": "Your 3rd grocery trip this week. You've spent €145 of €200 budget — consider batch shopping to reduce visits.",
        "created_at": "2026-06-02T14:32:00+00:00",
    },
    {
        "id": "ramya-txn-02",
        "date_label": "Today",
        "merchant": "TfL",
        "category": "Transport",
        "color": "#22D3EE",
        "amount": -4.80,
        "ai_tip": "Daily commute spend is on track. A monthly travelcard at €89 would save you ~€30 vs pay-as-you-go this month.",
        "created_at": "2026-06-02T09:15:00+00:00",
    },
    {
        "id": "ramya-txn-03",
        "date_label": "Yesterday",
        "merchant": "Spotify",
        "category": "Subscriptions",
        "color": "#1DB954",
        "amount": -9.99,
        "ai_tip": "You've had Spotify 8+ months. Bundling with Apple One saves €3/mo — or switch to free with student discount.",
        "created_at": "2026-06-01T12:00:00+00:00",
    },
    {
        "id": "ramya-txn-04",
        "date_label": "Yesterday",
        "merchant": "OpenAI",
        "category": "AI Tools",
        "color": "#10a37f",
        "amount": -20.00,
        "ai_tip": "You pay for both ChatGPT and GitHub Copilot. They overlap ~70% — dropping one saves €20/mo with no productivity loss.",
        "created_at": "2026-06-01T10:00:00+00:00",
    },
    {
        "id": "ramya-txn-05",
        "date_label": "Yesterday",
        "merchant": "Deliveroo",
        "category": "Food & Drink",
        "color": "#FF5FB6",
        "amount": -22.50,
        "ai_tip": "4th food delivery this month. At this rate you'll spend €90 on delivery fees alone. Cooking twice a week saves ~€60.",
        "created_at": "2026-06-01T19:45:00+00:00",
    },
    {
        "id": "ramya-txn-06",
        "date_label": "27 May",
        "merchant": "Salary",
        "category": "Income",
        "color": "#10B981",
        "amount": 1200.00,
        "ai_tip": "Stipend received on time. After fixed costs you have ~€77 surplus. Moving €50 to savings today extends runway by 3 days.",
        "created_at": "2026-05-27T08:00:00+00:00",
    },
    {
        "id": "ramya-txn-07",
        "date_label": "27 May",
        "merchant": "AWS",
        "category": "Cloud & Infra",
        "color": "#FF9900",
        "amount": -12.50,
        "ai_tip": "Cloud spend 25% over budget. Your EC2 instance runs idle 14h/day — switching to spot saves ~€8/mo immediately.",
        "created_at": "2026-05-27T00:01:00+00:00",
    },
    {
        "id": "ramya-txn-08",
        "date_label": "26 May",
        "merchant": "Vercel",
        "category": "Hosting",
        "color": "#8B5CF6",
        "amount": -20.00,
        "ai_tip": "Vercel Pro at €20/mo for personal projects is unnecessary. The free Hobby tier covers everything you're currently using.",
        "created_at": "2026-05-26T00:01:00+00:00",
    },
    {
        "id": "ramya-txn-09",
        "date_label": "26 May",
        "merchant": "GitHub",
        "category": "Dev Tools",
        "color": "#6e40c9",
        "amount": -4.00,
        "ai_tip": "GitHub Pro is fully covered by the GitHub Student Pack — you're paying for something that should be free. Claim it.",
        "created_at": "2026-05-26T00:02:00+00:00",
    },
    {
        "id": "ramya-txn-10",
        "date_label": "25 May",
        "merchant": "Tesco",
        "category": "Groceries",
        "color": "#F59E0B",
        "amount": -28.40,
        "ai_tip": "Combined grocery spend this week: €62.60. Your €200 budget is 31% used at the 25-day mark — you're on track.",
        "created_at": "2026-05-25T16:00:00+00:00",
    },
    {
        "id": "ramya-txn-11",
        "date_label": "25 May",
        "merchant": "Notion",
        "category": "Productivity",
        "color": "#B388FF",
        "amount": -16.00,
        "ai_tip": "Notion Plus at €16/mo — the free plan supports everything a solo developer needs. Consider downgrading to save.",
        "created_at": "2026-05-25T00:01:00+00:00",
    },
    {
        "id": "ramya-txn-12",
        "date_label": "25 May",
        "merchant": "JetBrains",
        "category": "Dev Tools",
        "color": "#22D3EE",
        "amount": -22.90,
        "ai_tip": "JetBrains All Products is free with a student or open-source license. You're paying for something you qualify for free.",
        "created_at": "2026-05-25T00:02:00+00:00",
    },
    {
        "id": "ramya-txn-13",
        "date_label": "24 May",
        "merchant": "Bolt",
        "category": "Transport",
        "color": "#34D399",
        "amount": -11.20,
        "ai_tip": "3 Bolt rides this week totalling €27. Public transport for the same routes costs ~€8 — worth checking journey times.",
        "created_at": "2026-05-24T21:30:00+00:00",
    },
    {
        "id": "ramya-txn-14",
        "date_label": "24 May",
        "merchant": "DigitalOcean",
        "category": "Cloud & Infra",
        "color": "#0080FF",
        "amount": -12.00,
        "ai_tip": "This droplet hasn't had meaningful traffic in 6 days. Snapshot it and destroy until you need it — saves €12/mo.",
        "created_at": "2026-05-24T00:01:00+00:00",
    },
    {
        "id": "ramya-txn-15",
        "date_label": "23 May",
        "merchant": "Landlord",
        "category": "Rent",
        "color": "#8B5CF6",
        "amount": -520.00,
        "ai_tip": "Rent is 43% of your total income. The healthy threshold is 30%. One additional €200 freelance client changes this ratio.",
        "created_at": "2026-05-23T08:00:00+00:00",
    },
]

# ── Bank accounts ─────────────────────────────────────────────────────────────

BANK_ACCOUNTS = [
    {
        "id": "ramya-bank-1",
        "bank": "Revolut",
        "type": "Current Account",
        "last4": "4821",
        "balance": 1842.50,
        "accent": "#00D1FF",
        "synced_mins": 12,
        "created_at": "2026-05-01T00:00:00+00:00",
    },
    {
        "id": "ramya-bank-2",
        "bank": "N26",
        "type": "Savings Account",
        "last4": "3309",
        "balance": 1557.20,
        "accent": "#7B61FF",
        "synced_mins": 45,
        "created_at": "2026-05-01T00:01:00+00:00",
    },
]

# ── Chart data ────────────────────────────────────────────────────────────────

DAILY_SPEND = [
    45, 12, 78, 23, 89, 34, 56, 78, 23, 45,
    12, 67, 34, 89, 23, 45, 67, 34, 12, 56,
    78, 45, 34, 67, 23, 45, 56, 34,
]

RUNWAY_PROJ = [
    3400, 3366, 3332, 3290, 3256, 3222, 3190, 3165,
    3133, 3100, 3078, 3044, 3012, 2984, 2956, 2924,
    2898, 2870, 2844, 2818, 2790, 2765, 2740, 2718,
    2695, 2674, 2654, 2640, 2625, 2612, 2600,
]


async def seed_ramya():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # ── Create Ramya's user account if not exists ────────────────────────
        cursor = await db.execute(
            "SELECT id FROM users WHERE id = ? OR email = ?", (RAMYA_ID, RAMYA_EMAIL)
        )
        existing = await cursor.fetchone()
        if not existing:
            await db.execute(
                """INSERT INTO users
                   (id, email, password_hash, name, created_at, focus, goal, fear,
                    agent_bio, agent_skills, agent_score, onboarding_complete)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    RAMYA_ID,
                    RAMYA_EMAIL,
                    hash_password(RAMYA_PASS),
                    RAMYA_NAME,
                    "2026-05-01T00:00:00+00:00",
                    "Software Engineering",
                    "Land a full-time SWE role at a tech company after my MSc",
                    "Running out of money before I finish my dissertation",
                    "MSc Computer Science student at UCL. Building distributed systems projects and tracking every euro.",
                    '["Python", "React", "TypeScript", "AWS", "Docker", "FastAPI"]',
                    7200,
                    1,
                ),
            )
            print(f"  Created user: {RAMYA_EMAIL}")
        else:
            print(f"  User already exists: {RAMYA_EMAIL}")

        # ── Profile (savings balance) ────────────────────────────────────────
        await db.execute(
            """INSERT INTO runway_profile (user_id, savings_balance, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE
               SET savings_balance = excluded.savings_balance,
                   updated_at      = excluded.updated_at""",
            (RAMYA_ID, 3400.0, "2026-06-02T00:00:00+00:00"),
        )

        # ── Income sources ───────────────────────────────────────────────────
        for src in INCOME_SOURCES:
            await db.execute(
                """INSERT OR IGNORE INTO runway_income_sources
                   (id, user_id, type, label, color, amount, active, created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (src["id"], RAMYA_ID, src["type"], src["label"],
                 src["color"], src["amount"], src["active"], src["created_at"]),
            )

        # ── Categories ───────────────────────────────────────────────────────
        for cat in CATEGORIES:
            await db.execute(
                """INSERT OR IGNORE INTO runway_categories
                   (id, user_id, label, spent, budget, color)
                   VALUES (?,?,?,?,?,?)""",
                (cat["id"], RAMYA_ID, cat["label"],
                 cat["spent"], cat["budget"], cat["color"]),
            )

        # ── Transactions ─────────────────────────────────────────────────────
        for txn in TRANSACTIONS:
            await db.execute(
                """INSERT OR IGNORE INTO runway_transactions
                   (id, user_id, date_label, merchant, category, color, amount, ai_tip, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (txn["id"], RAMYA_ID, txn["date_label"], txn["merchant"],
                 txn["category"], txn["color"], txn["amount"],
                 txn["ai_tip"], txn["created_at"]),
            )

        # ── Bank accounts ────────────────────────────────────────────────────
        for acc in BANK_ACCOUNTS:
            await db.execute(
                """INSERT OR IGNORE INTO runway_bank_accounts
                   (id, user_id, bank, type, last4, balance, accent, synced_mins, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (acc["id"], RAMYA_ID, acc["bank"], acc["type"], acc["last4"],
                 acc["balance"], acc["accent"], acc["synced_mins"], acc["created_at"]),
            )

        # ── Chart data ───────────────────────────────────────────────────────
        await db.execute(
            """INSERT INTO runway_chart_data (user_id, daily_spend_json, runway_proj_json, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE
               SET daily_spend_json = excluded.daily_spend_json,
                   runway_proj_json = excluded.runway_proj_json,
                   updated_at       = excluded.updated_at""",
            (RAMYA_ID, json.dumps(DAILY_SPEND), json.dumps(RUNWAY_PROJ),
             "2026-06-02T00:00:00+00:00"),
        )

        await db.commit()
        print("  Runway mock data seeded for Ramya.")


if __name__ == "__main__":
    asyncio.run(seed_ramya())
