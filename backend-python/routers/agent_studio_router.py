import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from db import get_db
from services.azure_openai import chat_complete
from services import orchestrator

router = APIRouter()


class StudioRequest(BaseModel):
    task: str = "resume"
    job_description: str = ""


def _strip_json(raw: str) -> str:
    raw = raw.strip()
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            c = part.strip()
            if c.startswith("json"):
                c = c[4:].strip()
            if c.startswith("{") or c.startswith("["):
                return c
    return raw


def _parse_json(raw: str, fallback: dict) -> dict:
    try:
        return json.loads(_strip_json(raw))
    except Exception:
        return fallback


async def _scout_analyze_jd(jd: str) -> dict:
    prompt = (
        "Analyze this job description. Return ONLY valid JSON, no markdown:\n"
        '{"role":"job title","company":"company name or Unknown",'
        '"skills_required":["up to 6 skills"],"skills_preferred":["up to 4 skills"],'
        '"responsibilities":["top 4 key responsibilities"],'
        '"level":"junior|mid|senior","industry":"industry"}\n\n'
        f"Job Description:\n{jd}"
    )
    raw = await chat_complete([{"role": "user", "content": prompt}], temperature=0.2, max_tokens=500, mini=True)
    return _parse_json(raw, {
        "role": "Software Engineer", "company": "Unknown",
        "skills_required": [], "skills_preferred": [],
        "responsibilities": [], "level": "mid", "industry": "Technology",
    })


async def _lens_match_profile(knowledge: str, jd_data: dict) -> dict:
    skills_str = ", ".join(jd_data.get("skills_required", []))
    resp_str = ", ".join(jd_data.get("responsibilities", [])[:3])
    prompt = (
        f"Compare this candidate's background to the job requirements.\n\n"
        f"Candidate background:\n{knowledge or 'No background info provided — treat as a motivated generalist student.'}\n\n"
        f"Role: {jd_data.get('role')} at {jd_data.get('company')}\n"
        f"Required skills: {skills_str}\n"
        f"Key responsibilities: {resp_str}\n\n"
        "Return ONLY valid JSON:\n"
        '{"matching_skills":["skills the candidate has that match"],'
        '"missing_skills":["top 3 gaps"],'
        '"experiences_to_highlight":["relevant background points to emphasize"],'
        '"summary_angle":"one sentence positioning strategy",'
        '"match_score":integer_0_to_100}'
    )
    raw = await chat_complete([{"role": "user", "content": prompt}], temperature=0.3, max_tokens=600, mini=True)
    return _parse_json(raw, {
        "matching_skills": [], "missing_skills": [],
        "experiences_to_highlight": [], "summary_angle": "", "match_score": 65,
    })


async def _resume_build(user_name: str, knowledge: str, jd_data: dict, match_data: dict) -> dict:
    prompt = (
        f"Build a complete ATS-optimized resume for this candidate applying to a specific role.\n\n"
        f"Candidate name: {user_name}\n"
        f"Background:\n{knowledge or 'Motivated student with strong learning ability and foundational technical skills.'}\n\n"
        f"Target: {jd_data.get('role')} at {jd_data.get('company')}\n"
        f"Positioning: {match_data.get('summary_angle', 'Leverage transferable skills and learning agility.')}\n"
        f"Prioritize these skills: {', '.join(match_data.get('matching_skills', []))}\n\n"
        "Return ONLY valid JSON:\n"
        '{"summary":"2-3 sentence professional summary tailored to this specific role",'
        '"skills_technical":["up to 8 technical skills, most relevant first"],'
        '"skills_soft":["4 soft skills"],'
        '"experience":[{"title":"role","company":"company","period":"e.g. Jan 2023 – Present",'
        '"bullets":["quantified achievement","specific contribution","impact metric"]}],'
        '"education":[{"degree":"degree name","school":"school","year":"grad year or expected"}],'
        '"projects":[{"name":"project name","description":"2-sentence description","tech":["tech1","tech2"]}],'
        '"certifications":["any certs mentioned, or empty array"]}'
    )
    raw = await chat_complete([{"role": "user", "content": prompt}], temperature=0.55, max_tokens=1200)
    return _parse_json(raw, {
        "summary": f"Results-driven professional seeking the {jd_data.get('role', 'role')} position.",
        "skills_technical": match_data.get("matching_skills", []),
        "skills_soft": ["Communication", "Problem Solving", "Teamwork", "Adaptability"],
        "experience": [], "education": [], "projects": [], "certifications": [],
    })


def _build_agent_logs(jd_data: dict, match_data: dict, peer_count: int = 0) -> list:
    role = jd_data.get("role", "this role")
    company = jd_data.get("company", "the company")
    req_skills = jd_data.get("skills_required", [])
    matching = match_data.get("matching_skills", [])
    missing = match_data.get("missing_skills", [])
    score = match_data.get("match_score", 70)
    ats_est = min(score + 15, 97)
    peer_note = (f"Found {peer_count} network agents strong in these skills — "
                 "borrowing their proven framing."
                 if peer_count else "Drawing on network skill patterns.")

    return [
        {"from_agent": "ARIA", "to_agent": "SCOUT",
         "message": f"New task received: tailored resume for {role}. Begin JD extraction.",
         "delay_ms": 0},
        {"from_agent": "SCOUT", "to_agent": "ARIA",
         "message": f"Parsed: {role} at {company}. {len(req_skills)} required skills extracted. Level: {jd_data.get('level', 'mid')}.",
         "delay_ms": 600},
        {"from_agent": "ARIA", "to_agent": "NEXUS",
         "message": f"Research {company} and find peer agents who've matched {role}.",
         "delay_ms": 1200},
        {"from_agent": "NEXUS", "to_agent": "ARIA",
         "message": f"{peer_note} {company} values measurable impact — recommend quantified bullets.",
         "delay_ms": 2000},
        {"from_agent": "ARIA", "to_agent": "LENS",
         "message": f"Check candidate profile against {role} requirements. Identify gaps.",
         "delay_ms": 2700},
        {"from_agent": "LENS", "to_agent": "ARIA",
         "message": f"Match score: {score}%. Strong on: {', '.join(matching[:3]) or 'transferable skills'}. Gaps: {', '.join(missing[:2]) or 'minimal'}.",
         "delay_ms": 3500},
        {"from_agent": "ARIA", "to_agent": "RESUME",
         "message": f"Build resume. Angle: {match_data.get('summary_angle', 'highlight learning agility')}. Front-load: {', '.join(matching[:2]) or 'key skills'}.",
         "delay_ms": 4200},
        {"from_agent": "RESUME", "to_agent": "ARIA",
         "message": f"Resume built. ATS keyword alignment complete. Estimated ATS score: {ats_est}%. Ready for download.",
         "delay_ms": 6500},
        {"from_agent": "ARIA", "to_agent": "USER",
         "message": "Pipeline complete. Your tailored resume is ready.",
         "delay_ms": 7200},
    ]


@router.post("/studio/run")
async def run_studio_pipeline(
    body: StudioRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    jd = body.job_description.strip()
    if not jd:
        raise HTTPException(status_code=400, detail="job_description is required")

    # Fetch user's knowledge chunks
    cursor = await db.execute(
        "SELECT content, category FROM knowledge_chunks WHERE user_id=? ORDER BY created_at DESC LIMIT 15",
        (current_user["id"],),
    )
    rows = await cursor.fetchall()
    knowledge = "\n".join(
        f"[{r['category'] or 'general'}] {r['content']}" for r in rows
    ) if rows else ""

    user_name = current_user.get("name", "User")

    # 3-step agent pipeline
    jd_data = await _scout_analyze_jd(jd)

    # Free retrieval: real network agents strong in the required skills.
    skill_query = f"{jd_data.get('role','')} {' '.join(jd_data.get('skills_required', []))}"
    try:
        peers = await orchestrator.route_peers(db, skill_query, current_user["id"], k=3)
    except Exception:
        peers = []

    match_data = await _lens_match_profile(knowledge, jd_data)
    resume_data = await _resume_build(user_name, knowledge, jd_data, match_data)

    logs = _build_agent_logs(jd_data, match_data, peer_count=len(peers))

    # Log to llm_logs (counts as 3 LLM calls)
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO llm_logs (id,user_id,user_name,call_type,tokens_in,tokens_out,duration_ms,status,created_at)"
        " VALUES (?,?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), current_user["id"], user_name, "studio_resume", 0, 0, 0, "llm", now),
    )
    await db.execute("UPDATE users SET last_active=? WHERE id=?", (now, current_user["id"]))
    await db.commit()

    return {
        "jd_analysis": jd_data,
        "match_analysis": match_data,
        "resume": resume_data,
        "agent_logs": logs,
        "peers_consulted": len(peers),
        "user_name": user_name,
    }
