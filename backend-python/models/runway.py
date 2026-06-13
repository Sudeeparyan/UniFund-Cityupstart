from pydantic import BaseModel
from typing import Optional, List

class RunwayProfile(BaseModel):
    savings_balance: float

class RunwayProfileOut(BaseModel):
    savings_balance: float

class IncomeSourceIn(BaseModel):
    type: str
    label: str
    color: str
    amount: float
    active: bool = True

class IncomeSourceUpdate(BaseModel):
    amount: Optional[float] = None
    active: Optional[bool] = None
    label: Optional[str] = None

class IncomeSourceOut(BaseModel):
    id: str
    type: str
    label: str
    color: str
    amount: float
    active: bool

class CategoryOut(BaseModel):
    id: str
    label: str
    spent: float
    budget: float
    color: str

class TransactionOut(BaseModel):
    id: str
    date_label: str
    merchant: str
    category: str
    color: str
    amount: float
    ai_tip: str

class BankAccountIn(BaseModel):
    bank: str
    type: str
    last4: str
    balance: float
    accent: str

class BankAccountOut(BaseModel):
    id: str
    bank: str
    type: str
    last4: str
    balance: float
    accent: str
    synced_mins: int

class ChartsOut(BaseModel):
    daily_spend: List[float]
    runway_proj: List[float]

class SimExpenseIn(BaseModel):
    id: str
    label: str
    amount: float

class SimPlanRequest(BaseModel):
    monthly_income: float
    expenses: List[SimExpenseIn]

class RecommendationOut(BaseModel):
    title: str
    detail: str
    impact: int

class SplitOut(BaseModel):
    fixed: float
    variable: float
    subs: float
    savings: float

class SimPlanOut(BaseModel):
    monthly_income: float
    total_spend: float
    surplus: float
    savings_actual: float
    target_savings: float
    split: SplitOut
    recommendations: List[RecommendationOut]
    year_actual: float
    year_target: float
    knowledge_count: int
    personalised: bool

class TipRequest(BaseModel):
    merchant: str
    category: str
    amount: float
    date_label: str

class TipOut(BaseModel):
    tip: str
    personalised: bool
