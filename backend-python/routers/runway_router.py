import json
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from auth import get_current_user
from db import get_db
from services.azure_openai import chat_complete
from models.runway import (
    RunwayProfile, RunwayProfileOut,
    IncomeSourceIn, IncomeSourceUpdate, IncomeSourceOut,
    CategoryOut, TransactionOut,
    BankAccountIn, BankAccountOut,
    ChartsOut,
    SimPlanRequest, SimPlanOut, RecommendationOut, SplitOut,
    TipRequest, TipOut,
)

router = APIRouter()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Profile (savings balance) ─────────────────────────────────────────────────

@router.get("/profile", response_model=RunwayProfileOut)
async def get_profile(user=Depends(get_current_user), db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT savings_balance FROM runway_profile WHERE user_id = ?", (user["id"],)
    )
    row = await cursor.fetchone()
    if not row:
        return RunwayProfileOut(savings_balance=0.0)
    return RunwayProfileOut(savings_balance=row[0])


@router.put("/profile", response_model=RunwayProfileOut)
async def update_profile(body: RunwayProfile, user=Depends(get_current_user), db=Depends(get_db)):
    await db.execute(
        "INSERT INTO runway_profile (user_id, savings_balance, updated_at) VALUES (?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET savings_balance=excluded.savings_balance, updated_at=excluded.updated_at",
        (user["id"], body.savings_balance, now_iso())
    )
    await db.commit()
    return RunwayProfileOut(savings_balance=body.savings_balance)


# ── Income sources ────────────────────────────────────────────────────────────

@router.get("/income", response_model=List[IncomeSourceOut])
async def list_income(user=Depends(get_current_user), db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, type, label, color, amount, active FROM runway_income_sources WHERE user_id = ? ORDER BY created_at",
        (user["id"],)
    )
    rows = await cursor.fetchall()
    return [IncomeSourceOut(id=r[0], type=r[1], label=r[2], color=r[3], amount=r[4], active=bool(r[5])) for r in rows]


@router.post("/income", response_model=IncomeSourceOut)
async def add_income(body: IncomeSourceIn, user=Depends(get_current_user), db=Depends(get_db)):
    sid = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO runway_income_sources (id, user_id, type, label, color, amount, active, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (sid, user["id"], body.type, body.label, body.color, body.amount, int(body.active), now_iso())
    )
    await db.commit()
    return IncomeSourceOut(id=sid, type=body.type, label=body.label, color=body.color, amount=body.amount, active=body.active)


@router.put("/income/{source_id}", response_model=IncomeSourceOut)
async def update_income(source_id: str, body: IncomeSourceUpdate, user=Depends(get_current_user), db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, type, label, color, amount, active FROM runway_income_sources WHERE id = ? AND user_id = ?",
        (source_id, user["id"])
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Income source not found")

    new_amount = body.amount if body.amount is not None else row[4]
    new_active = int(body.active) if body.active is not None else row[5]
    new_label  = body.label if body.label is not None else row[2]

    await db.execute(
        "UPDATE runway_income_sources SET amount=?, active=?, label=? WHERE id=?",
        (new_amount, new_active, new_label, source_id)
    )
    await db.commit()
    return IncomeSourceOut(id=row[0], type=row[1], label=new_label, color=row[3], amount=new_amount, active=bool(new_active))


@router.delete("/income/{source_id}")
async def delete_income(source_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    await db.execute(
        "DELETE FROM runway_income_sources WHERE id = ? AND user_id = ?",
        (source_id, user["id"])
    )
    await db.commit()
    return {"ok": True}


# ── Spending categories ───────────────────────────────────────────────────────

@router.get("/categories", response_model=List[CategoryOut])
async def list_categories(user=Depends(get_current_user), db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, label, spent, budget, color FROM runway_categories WHERE user_id = ? ORDER BY rowid",
        (user["id"],)
    )
    rows = await cursor.fetchall()
    return [CategoryOut(id=r[0], label=r[1], spent=r[2], budget=r[3], color=r[4]) for r in rows]


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=List[TransactionOut])
async def list_transactions(user=Depends(get_current_user), db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, date_label, merchant, category, color, amount, ai_tip FROM runway_transactions "
        "WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],)
    )
    rows = await cursor.fetchall()
    return [TransactionOut(id=r[0], date_label=r[1], merchant=r[2], category=r[3],
                           color=r[4], amount=r[5], ai_tip=r[6]) for r in rows]


# ── Bank accounts ─────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=List[BankAccountOut])
async def list_accounts(user=Depends(get_current_user), db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, bank, type, last4, balance, accent, synced_mins FROM runway_bank_accounts WHERE user_id = ? ORDER BY created_at",
        (user["id"],)
    )
    rows = await cursor.fetchall()
    return [BankAccountOut(id=r[0], bank=r[1], type=r[2], last4=r[3], balance=r[4], accent=r[5], synced_mins=r[6]) for r in rows]


@router.post("/accounts", response_model=BankAccountOut)
async def add_account(body: BankAccountIn, user=Depends(get_current_user), db=Depends(get_db)):
    aid = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO runway_bank_accounts (id, user_id, bank, type, last4, balance, accent, synced_mins, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (aid, user["id"], body.bank, body.type, body.last4, body.balance, body.accent, 0, now_iso())
    )
    await db.commit()
    return BankAccountOut(id=aid, bank=body.bank, type=body.type, last4=body.last4,
                          balance=body.balance, accent=body.accent, synced_mins=0)


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    await db.execute(
        "DELETE FROM runway_bank_accounts WHERE id = ? AND user_id = ?",
        (account_id, user["id"])
    )
    await db.commit()
    return {"ok": True}


# ── AI Savings Plan ───────────────────────────────────────────────────────────

# IDs that belong to each bucket (mirrors the frontend computePlan logic)
_FIXED_IDS = {"rent", "transport", "health"}
_SUBS_IDS  = {"cloud", "devtools", "ai", "domains", "learning"}

_FALLBACK_RECS = [
    RecommendationOut(
        title="Auto-transfer savings the moment you get paid",
        detail="Moving money to savings before you can spend it is the single highest-impact habit for runway extension. Even €50/mo compounds over 6 months into a meaningful buffer.",
        impact=50,
    ),
    RecommendationOut(
        title="Audit subscriptions for overlap",
        detail="Dev tools, AI assistants, and cloud services overlap heavily. Most developers cut €20–35/mo with zero productivity loss after a 30-minute audit.",
        impact=28,
    ),
    RecommendationOut(
        title="Replace two food deliveries per week with cooking",
        detail="Each skipped delivery saves ~€12. Twice a week equals €96/mo and frees budget for higher-leverage spending like courses or hardware.",
        impact=96,
    ),
    RecommendationOut(
        title="Switch idle cloud instances to spot pricing",
        detail="Instances running at low utilisation can move to spot or be snapshotted and destroyed. This typically saves 60–80% on the idle portion of your cloud bill.",
        impact=18,
    ),
]


def _compute_split(expenses: list, surplus: float) -> SplitOut:
    fixed = sum(e.amount for e in expenses if e.id in _FIXED_IDS)
    subs  = sum(e.amount for e in expenses if e.id in _SUBS_IDS)
    variable = sum(e.amount for e in expenses if e.id not in _FIXED_IDS and e.id not in _SUBS_IDS)
    savings = max(0.0, surplus)
    return SplitOut(fixed=fixed, variable=variable, subs=subs, savings=savings)


async def _llm_recommendations(
    user: dict,
    chunks: list,
    monthly_income: float,
    total_spend: float,
    surplus: float,
    target_savings: float,
    expenses: list,
) -> list[RecommendationOut]:
    """Call gpt-5-chat to generate 4 personalised recommendations. Returns fallbacks on any error."""

    # Build knowledge context from chunks
    knowledge_text = "\n".join(
        f"- [{r['category'] or 'general'}] {r['content']}" for r in chunks
    ) if chunks else "No personal context available yet."

    # Summarise over-budget categories for the prompt
    over_budget = [
        f"{e.label} (€{e.amount:.0f} spent, over budget)"
        for e in expenses
        if e.amount > 0  # backend has no budget values, flag anything > 0 that seems high
    ]
    category_lines = "\n".join(f"  {e.label}: €{e.amount:.0f}/mo" for e in expenses)
    gap = max(0.0, target_savings - max(0.0, surplus))
    abs_surplus = abs(surplus)
    surplus_label = "surplus" if surplus >= 0 else "deficit"

    system = (
        "You are UniFund's AI finance advisor. You give hyper-personalised savings advice "
        "for students and early-career developers.\n\n"
        "Return ONLY raw valid JSON — no markdown fences, no explanation.\n\n"
        "Output exactly this structure (an array of 4 objects):\n"
        '[{"title":"action under 12 words","detail":"2 sentences","impact":50},'
        '{"title":"...","detail":"...","impact":30},'
        '{"title":"...","detail":"...","impact":25},'
        '{"title":"...","detail":"...","impact":20}]\n\n'
        "Rules:\n"
        "- Exactly 4 items, ordered by impact descending\n"
        "- Title: specific, actionable — never generic\n"
        "- Detail: sentence 1 references their personal background/goals; "
        "sentence 2 states exact euro savings or % impact\n"
        "- Impact: realistic integer monthly euro saving\n"
        "- Tone: direct, sharp, like a smart friend who knows their numbers\n"
        "- Do NOT invent numbers not derivable from the data provided"
    )

    user_content = (
        f"USER: {user.get('name', 'Unknown')}\n"
        f"Bio: {user.get('agent_bio') or 'Not provided'}\n"
        f"Goal: {user.get('goal') or 'Not set'}\n"
        f"Fear: {user.get('fear') or 'Not set'}\n\n"
        f"PERSONAL BACKGROUND (from their own words):\n{knowledge_text}\n\n"
        f"FINANCES THIS MONTH:\n"
        f"Monthly income: €{monthly_income:.0f}\n"
        f"Total spending: €{total_spend:.0f}/mo\n"
        f"Monthly {surplus_label}: €{abs_surplus:.0f}\n\n"
        f"SPENDING BREAKDOWN:\n{category_lines}\n\n"
        f"SAVINGS TARGET: €{target_savings:.0f}/mo (20% of income)\n"
        f"Currently saving: €{max(0.0, surplus):.0f}/mo\n"
        f"Gap to close: €{gap:.0f}/mo\n\n"
        "Generate 4 recommendations to help this specific person extend their runway."
    )

    try:
        raw = await chat_complete(
            [{"role": "system", "content": system},
             {"role": "user", "content": user_content}],
            temperature=0.75,
            max_tokens=600,
        )
        raw = raw.strip()
        # Strip markdown fences if present
        if "```" in raw:
            for part in raw.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("["):
                    raw = part
                    break
        recs_data = json.loads(raw)
        if not isinstance(recs_data, list) or len(recs_data) == 0:
            raise ValueError("not a list")
        return [
            RecommendationOut(
                title=str(r.get("title", "Recommendation")),
                detail=str(r.get("detail", "")),
                impact=int(r.get("impact", 0)),
            )
            for r in recs_data[:4]
        ]
    except Exception:
        return _FALLBACK_RECS


@router.post("/simulate", response_model=SimPlanOut)
async def simulate_runway(
    body: SimPlanRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    # Pull knowledge chunks (same limit as life simulation)
    cursor = await db.execute(
        "SELECT content, category FROM knowledge_chunks WHERE user_id = ? ORDER BY created_at DESC LIMIT 15",
        (user["id"],),
    )
    rows = await cursor.fetchall()
    chunks = [{"content": r["content"], "category": r["category"]} for r in rows]

    income      = body.monthly_income
    total_spend = sum(e.amount for e in body.expenses)
    surplus     = income - total_spend
    target      = round(income * 0.20)
    split       = _compute_split(body.expenses, surplus)

    recs = await _llm_recommendations(
        user, chunks, income, total_spend, surplus, target, body.expenses
    )

    personalised = len(chunks) > 0

    return SimPlanOut(
        monthly_income=income,
        total_spend=total_spend,
        surplus=surplus,
        savings_actual=split.savings,
        target_savings=float(target),
        split=split,
        recommendations=recs,
        year_actual=split.savings * 12,
        year_target=float(target * 12),
        knowledge_count=len(chunks),
        personalised=personalised,
    )


# ── AI Transaction Tip ───────────────────────────────────────────────────────

@router.post("/tip", response_model=TipOut)
async def generate_tip(
    body: TipRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    # Pull knowledge chunks for personalisation
    cursor = await db.execute(
        "SELECT content, category FROM knowledge_chunks WHERE user_id=? ORDER BY created_at DESC LIMIT 10",
        (user["id"],),
    )
    rows = await cursor.fetchall()
    chunks = [{"content": r["content"], "category": r["category"]} for r in rows]

    # Get this category's budget context (best-effort match on label)
    cat_cursor = await db.execute(
        "SELECT label, spent, budget FROM runway_categories WHERE user_id=? AND lower(label) LIKE ?",
        (user["id"], f"%{body.category.lower()[:6]}%"),
    )
    cat_row = await cat_cursor.fetchone()
    cat_context = (
        f"{cat_row['label']}: €{cat_row['spent']:.0f} spent of €{cat_row['budget']:.0f} budget this month"
        if cat_row else ""
    )

    knowledge_text = (
        "\n".join(f"- [{r['category'] or 'general'}] {r['content']}" for r in chunks)
        if chunks else "No personal context yet."
    )

    system = (
        "You are UniFund's AI spending analyst. Write one short insight for a single transaction.\n\n"
        "Return ONLY a plain string — no JSON, no markdown, no quotes, no bullet points.\n\n"
        "Rules:\n"
        "- 2 sentences maximum\n"
        "- Sentence 1: a specific observation about this transaction based on the user's context\n"
        "- Sentence 2: one concrete actionable tip with an exact euro saving where possible\n"
        "- Reference the user's personal goals or situation if relevant — don't be generic\n"
        "- Tone: direct and smart, like a finance-savvy friend\n"
        "- For income transactions: acknowledge positively and suggest what to do with it"
    )

    user_content = (
        f"User: {user.get('name', 'Unknown')}\n"
        f"Goal: {user.get('goal') or 'not set'}\n"
        f"Fear: {user.get('fear') or 'not set'}\n\n"
        f"Personal context:\n{knowledge_text}\n\n"
        f"Transaction:\n"
        f"Merchant: {body.merchant}\n"
        f"Category: {body.category}\n"
        f"Amount: €{abs(body.amount):.2f} ({'income' if body.amount > 0 else 'expense'})\n"
        f"Date: {body.date_label}\n"
        + (f"\nCategory budget: {cat_context}" if cat_context else "")
    )

    personalised = len(chunks) > 0

    try:
        tip = await chat_complete(
            [{"role": "system", "content": system},
             {"role": "user", "content": user_content}],
            temperature=0.75,
            max_tokens=150,
        )
        return TipOut(tip=tip.strip(), personalised=personalised)
    except Exception:
        return TipOut(
            tip=f"Check your {body.category} spending — small recurring costs add up fast.",
            personalised=False,
        )


# ── Chart data ────────────────────────────────────────────────────────────────

@router.get("/charts", response_model=ChartsOut)
async def get_charts(user=Depends(get_current_user), db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT daily_spend_json, runway_proj_json FROM runway_chart_data WHERE user_id = ?",
        (user["id"],)
    )
    row = await cursor.fetchone()
    if not row:
        return ChartsOut(daily_spend=[], runway_proj=[])
    return ChartsOut(
        daily_spend=json.loads(row[0]),
        runway_proj=json.loads(row[1]),
    )
