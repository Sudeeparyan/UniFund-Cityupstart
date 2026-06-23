"""Synthetic student-survey generator → real, functional agents.

Generates N (default 485) international-student survey responses (the form the
user submitted), derives a full agent from each answer set (profile + knowledge
chunks), and seeds them into the DB as real users + embedded agent cards.

Deterministic (fixed RNG seed) → reproducible & idempotent. Embeddings are
batched for speed and are free (local). No LLM calls.

Survey questions modelled (exact options from the user's form):
  1. What best describes you?
  2. How often do you worry about your finances as a student?
  3. Have you ever worried about running out of money before the semester ends?
  4. How confident are you that your degree/career path leads to the job you want?
  5. Where do you usually go for advice? (free text)
  6. Do you feel valuable student knowledge is lost when students graduate?
  7. How useful would the imagined platform be?
  8. Which feature would interest you most?
  9. What is the biggest challenge you currently face as a student?
"""

import json
import random
from datetime import datetime, timezone

import aiosqlite

from db import DB_PATH
from services import embeddings as emb

# ── Name pools (mostly international: India + China heaviest) ──────────────────
NAME_POOLS = {
    "India": (
        ["Aarav", "Vivaan", "Aditya", "Arjun", "Rohan", "Ishaan", "Sai", "Karthik",
         "Rahul", "Vikram", "Aryan", "Krishna", "Deepak", "Ananya", "Diya", "Kavya",
         "Saanvi", "Priya", "Sneha", "Meera", "Pooja", "Neha", "Riya", "Anjali",
         "Lakshmi", "Sruthi", "Harini", "Nikhil", "Tarun", "Manish"],
        ["Sharma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Singh", "Kumar",
         "Rao", "Mehta", "Desai", "Joshi", "Verma", "Chowdhury", "Banerjee",
         "Pillai", "Menon", "Naidu", "Bose", "Kapoor"],
    ),
    "China": (
        ["Wei", "Hao", "Ming", "Lei", "Jun", "Tao", "Feng", "Qiang", "Yu", "Bo",
         "Jing", "Yan", "Fang", "Xin", "Hui", "Na", "Ling", "Mei", "Juan", "Ting"],
        ["Wang", "Li", "Zhang", "Liu", "Chen", "Yang", "Huang", "Zhao", "Wu",
         "Zhou", "Xu", "Sun", "Ma", "Zhu", "Hu", "Guo", "Lin", "He", "Gao", "Luo"],
    ),
    "Vietnam": (
        ["Anh", "Minh", "Linh", "Huy", "Thao", "Duc", "Mai", "Quang", "Trang", "Nam"],
        ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Dang", "Bui", "Do"],
    ),
    "Nigeria": (
        ["Chinedu", "Ngozi", "Emeka", "Adaeze", "Oluwaseun", "Chidi", "Amara",
         "Tunde", "Ifeoma", "Obinna"],
        ["Adebayo", "Okafor", "Okonkwo", "Eze", "Chukwu", "Balogun", "Afolabi",
         "Nwachukwu", "Olawale", "Obi"],
    ),
    "Pakistan": (
        ["Hassan", "Ayesha", "Bilal", "Fatima", "Usman", "Zainab", "Ahmed",
         "Hira", "Saad", "Maryam"],
        ["Khan", "Ali", "Hussain", "Malik", "Sheikh", "Qureshi", "Butt",
         "Raza", "Iqbal", "Chaudhry"],
    ),
    "South Korea": (
        ["Min-jun", "Seo-yeon", "Ji-ho", "Ha-eun", "Joon-ho", "Soo-min",
         "Hyun-woo", "Ye-jin", "Dong-hyun", "Su-bin"],
        ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim"],
    ),
    "Bangladesh": (
        ["Rahim", "Karim", "Nadia", "Tanvir", "Sadia", "Imran", "Farhan", "Sumaiya"],
        ["Islam", "Rahman", "Hossain", "Ahmed", "Chowdhury", "Khatun", "Akter", "Ali"],
    ),
    "Iran": (
        ["Ali", "Sara", "Reza", "Maryam", "Amir", "Niloofar", "Hossein", "Yasmin"],
        ["Hosseini", "Ahmadi", "Rezaei", "Mohammadi", "Karimi", "Jafari", "Moradi", "Sadeghi"],
    ),
    "Brazil": (
        ["Lucas", "Maria", "Pedro", "Ana", "Gabriel", "Julia", "Rafael", "Beatriz"],
        ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Almeida"],
    ),
    "Ireland": (
        ["Sean", "Aoife", "Cian", "Saoirse", "Conor", "Niamh", "Liam", "Ciara"],
        ["Murphy", "Kelly", "O'Brien", "Ryan", "Walsh", "Byrne", "O'Connor", "Doyle"],
    ),
}
# Weights — India & China dominate, then the rest.
COUNTRY_WEIGHTS = {
    "India": 36, "China": 22, "Vietnam": 7, "Nigeria": 7, "Pakistan": 6,
    "South Korea": 5, "Bangladesh": 5, "Iran": 4, "Brazil": 4, "Ireland": 4,
}

FIELDS = {
    "Computer Science": ["Python", "Java", "Algorithms", "Web Development"],
    "Data Science": ["Python", "Pandas", "Machine Learning", "SQL", "Statistics"],
    "Artificial Intelligence": ["Python", "Deep Learning", "PyTorch", "NLP"],
    "Cybersecurity": ["Networking", "Linux", "Penetration Testing", "Cryptography"],
    "Information Systems": ["SQL", "Cloud", "Business Analysis", "Python"],
    "Business Analytics": ["Excel", "Power BI", "SQL", "Statistics"],
    "Finance": ["Financial Modelling", "Excel", "Accounting", "Valuation"],
    "Marketing": ["SEO", "Content", "Branding", "Analytics"],
    "Mechanical Engineering": ["CAD", "SolidWorks", "Thermodynamics", "MATLAB"],
    "Electrical Engineering": ["Circuits", "Embedded Systems", "MATLAB", "Control"],
    "Civil Engineering": ["AutoCAD", "Structural Analysis", "Project Management"],
    "Pharmacy": ["Pharmacology", "Chemistry", "Clinical Research"],
    "Biotechnology": ["Molecular Biology", "Lab Techniques", "Bioinformatics"],
    "Economics": ["Econometrics", "Statistics", "Data Analysis", "Research"],
    "Management": ["Leadership", "Strategy", "Operations", "Communication"],
    "Accounting": ["Bookkeeping", "Excel", "Auditing", "Taxation"],
    "Public Health": ["Epidemiology", "Statistics", "Health Policy"],
    "Psychology": ["Research Methods", "Statistics", "Counselling"],
}

UNIVERSITIES = [
    "Trinity College Dublin", "University College Dublin", "National College of Ireland",
    "Dublin City University", "University of Limerick", "University of Galway",
    "Munster Technological University", "TU Dublin", "Maynooth University",
    "University College Cork",
]

LEVELS = ["Undergraduate Student", "Postgraduate Student",
          "Recent Graduate (within 2 years)", "Other"]
LEVEL_W = [50, 35, 12, 3]

FINANCE_WORRY = ["Never", "Occasionally", "Sometimes", "Often", "Always"]
FINANCE_WORRY_W = [6, 22, 30, 28, 14]

YES_NO_MAYBE = ["Yes", "No", "Maybe"]
RAN_OUT_W = [58, 27, 15]
KNOWLEDGE_LOST_W = [70, 12, 18]

CONFIDENCE = ["Very Confident", "Confident", "Neutral", "Not Confident", "Not Confident At All"]
CONFIDENCE_W = [10, 28, 34, 20, 8]

USEFULNESS = ["Extremely Useful", "Very Useful", "Somewhat Useful",
              "Not very Useful", "Not useful At All"]
USEFULNESS_W = [34, 38, 20, 6, 2]

ADVICE_SOURCES = [
    "Friends and seniors", "Google and YouTube", "University career advisor",
    "Reddit and online forums", "Family", "LinkedIn", "Professors",
    "Nobody — I usually figure it out myself",
]
ADVICE_W = [26, 20, 10, 14, 10, 8, 7, 5]

FEATURES = [
    "Predict how long my money will last",
    "Connect with students who faced similar challenges",
    "Explore likely career outcomes from real student journeys",
]
FEATURE_W = [34, 30, 36]

CHALLENGES = [
    "Managing finances, rent and living costs",
    "Finding an internship or graduate job",
    "Balancing part-time work with studies",
    "Visa and immigration stress",
    "Choosing the right specialization",
    "Imposter syndrome and self-doubt",
    "Language and cultural barriers",
    "Intense job-market competition",
    "Time management and avoiding burnout",
    "Building a professional network from scratch",
]
CHALLENGE_W = [22, 20, 12, 10, 8, 7, 7, 6, 5, 3]


def _wchoice(rng, options, weights):
    return rng.choices(options, weights=weights, k=1)[0]


def _survey_to_agent(rng, country, level, field, university, survey) -> dict:
    """Derive a functional agent profile + knowledge chunks from survey answers."""
    short_level = {
        "Undergraduate Student": "Undergraduate",
        "Postgraduate Student": "Postgraduate",
        "Recent Graduate (within 2 years)": "Recent graduate",
        "Other": "Student",
    }[level]
    skills = FIELDS[field]

    focus = f"{short_level} in {field}"
    # Goal from confidence + feature interest.
    if "career outcomes" in survey["feature_interest"]:
        goal = f"Understand which career path in {field} actually leads to a job"
    elif "money" in survey["feature_interest"]:
        goal = f"Stay financially stable through my {field} studies"
    else:
        goal = f"Connect with people ahead of me in {field} and learn from them"
    # Fear from finance worry + challenge.
    if survey["finance_worry_frequency"] in ("Often", "Always") or survey["worried_running_out_of_money"] == "Yes":
        fear = f"Running out of money before the semester ends ({survey['biggest_challenge'].lower()})"
    elif survey["career_path_confidence"] in ("Not Confident", "Not Confident At All"):
        fear = f"Graduating in {field} without a clear job at the end"
    else:
        fear = survey["biggest_challenge"]

    bio = (f"{short_level} from {country} studying {field} at {university}. "
           f"Biggest focus right now: {survey['biggest_challenge'].lower()}.")

    chunks = [
        ("experience", f"{short_level} studying {field} at {university}, originally from {country}."),
        ("skill", f"Building skills in {', '.join(skills)} through the {field} programme."),
        ("fear", fear),
        ("goal", goal),
        ("general", f"Worries about finances '{survey['finance_worry_frequency'].lower()}'; "
                    f"usually seeks advice from {survey['advice_source'].lower()}."),
        ("experience", f"Biggest current challenge as an international student: {survey['biggest_challenge'].lower()}."),
    ]

    # Engagement score (varied; below the featured personas' 10k-14k band).
    base = 120
    base += {"Extremely Useful": 1800, "Very Useful": 1300, "Somewhat Useful": 700,
             "Not very Useful": 250, "Not useful At All": 80}[survey["platform_usefulness"]]
    base += {"Very Confident": 600, "Confident": 450, "Neutral": 300,
             "Not Confident": 200, "Not Confident At All": 120}[survey["career_path_confidence"]]
    base += rng.randint(0, 900)
    score = int(base)

    return {"focus": focus, "goal": goal, "fear": fear, "bio": bio,
            "skills": skills, "score": score, "chunks": chunks}


def generate_students(n: int = 485, seed: int = 4825) -> list[dict]:
    """Return n synthetic student records (survey answers + derived agent)."""
    rng = random.Random(seed)
    countries = list(COUNTRY_WEIGHTS.keys())
    cweights = list(COUNTRY_WEIGHTS.values())
    fields = list(FIELDS.keys())
    records = []
    for i in range(1, n + 1):
        country = _wchoice(rng, countries, cweights)
        firsts, lasts = NAME_POOLS[country]
        name = f"{rng.choice(firsts)} {rng.choice(lasts)}"
        level = _wchoice(rng, LEVELS, LEVEL_W)
        field = rng.choice(fields)
        university = rng.choice(UNIVERSITIES)

        survey = {
            "what_best_describes_you": level,
            "finance_worry_frequency": _wchoice(rng, FINANCE_WORRY, FINANCE_WORRY_W),
            "worried_running_out_of_money": _wchoice(rng, YES_NO_MAYBE, RAN_OUT_W),
            "career_path_confidence": _wchoice(rng, CONFIDENCE, CONFIDENCE_W),
            "advice_source": _wchoice(rng, ADVICE_SOURCES, ADVICE_W),
            "knowledge_lost_when_graduate": _wchoice(rng, YES_NO_MAYBE, KNOWLEDGE_LOST_W),
            "platform_usefulness": _wchoice(rng, USEFULNESS, USEFULNESS_W),
            "feature_interest": _wchoice(rng, FEATURES, FEATURE_W),
            "biggest_challenge": _wchoice(rng, CHALLENGES, CHALLENGE_W),
        }
        agent = _survey_to_agent(rng, country, level, field, university, survey)
        records.append({
            "id": f"student-{i:04d}",
            "name": name,
            "country": country,
            "field": field,
            "level": level,
            "university": university,
            "survey": survey,
            "agent": agent,
        })
    return records


def _card_text(r: dict) -> str:
    a = r["agent"]
    return f"{a['bio']} Skills: {', '.join(a['skills'])}. Goal: {a['goal']}."


async def seed_students(records: list[dict]) -> dict:
    """Seed records as real users + chunks + embedded agent cards. Idempotent.
    Embeddings are batched. Returns a stats dict."""
    backend = emb.backend_name()
    now = datetime.now(timezone.utc).isoformat()
    try:
        from auth import hash_password
        pw = hash_password("__student__")
    except Exception:
        pw = "x"

    # Batch every embedding up front (one model pass).
    chunk_texts, card_texts = [], []
    for r in records:
        for _, content in r["agent"]["chunks"]:
            chunk_texts.append(content)
        card_texts.append(_card_text(r))
    chunk_vecs = await emb.embed_batch(chunk_texts)
    card_vecs = await emb.embed_batch(card_texts)

    inserted_users = 0
    ci = 0  # running index into chunk_vecs
    async with aiosqlite.connect(DB_PATH) as db:
        for k, r in enumerate(records):
            uid = r["id"]
            a = r["agent"]
            email = f"{uid}@unimind.network"
            cur = await db.execute(
                "INSERT OR IGNORE INTO users (id,email,password_hash,name,created_at,"
                "focus,goal,fear,agent_bio,agent_skills,agent_score,onboarding_complete)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,1)",
                (uid, email, pw, r["name"], now, a["focus"], a["goal"], a["fear"],
                 a["bio"], json.dumps(a["skills"]), a["score"]),
            )
            inserted_users += cur.rowcount if cur.rowcount and cur.rowcount > 0 else 0

            for j, (cat, content) in enumerate(r["agent"]["chunks"]):
                chunk_id = f"{uid}-c{j}"
                await db.execute(
                    "INSERT OR IGNORE INTO knowledge_chunks (id,user_id,content,category,created_at)"
                    " VALUES (?,?,?,?,?)",
                    (chunk_id, uid, content, cat, now),
                )
                await db.execute(
                    "INSERT OR REPLACE INTO chunk_embeddings (chunk_id,vector,model,created_at)"
                    " VALUES (?,?,?,?)",
                    (chunk_id, emb.to_blob(chunk_vecs[ci]), backend, now),
                )
                ci += 1

            await db.execute(
                "INSERT OR REPLACE INTO agent_cards (user_id,summary,skills_json,card_vector,model,updated_at)"
                " VALUES (?,?,?,?,?,?)",
                (uid, a["bio"], json.dumps(a["skills"]),
                 emb.to_blob(card_vecs[k]), backend, now),
            )
        await db.commit()

    return {
        "records": len(records),
        "users_inserted": inserted_users,
        "chunks_embedded": len(chunk_texts),
        "cards": len(records),
        "embedding_backend": backend,
    }
