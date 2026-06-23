import io
import json
import base64
from services.azure_openai import chat_complete

SYSTEM_PROMPT_TEMPLATE = (
    "You are UniMind's knowledge agent — a sharp, fast-moving AI interviewer. "
    "Your mission: learn what makes this user unique in 6-8 exchanges maximum. "
    "Build their digital agent profile for life simulation accuracy.\n\n"
    "Rules:\n"
    "1. Ask ONE sharp, direct question per reply. Under 80 words total.\n"
    "2. Combine 2 related things in one question when natural "
    "(e.g. 'What are you building and what's blocking you right now?').\n"
    "3. Cover these in order: identity → goals → skills → biggest fear/obstacle.\n"
    "4. Be warm and direct — not corporate. Use their name once early.\n"
    "5. After 6-8 exchanges OR when you have 5+ knowledge chunks, say EXACTLY: "
    "'Your agent profile is ready — the UniMind web now knows you.' "
    "then give a 3-bullet summary of what you learned.\n"
    "6. Never repeat a question already asked.\n\n"
    "Current user: {name}\n"
    "Knowledge collected so far ({chunk_count} chunks): {knowledge_summary}"
)

EXTRACT_PROMPT_TEMPLATE = (
    "Extract knowledge from this user message for their UniMind agent profile.\n"
    "User said: \"{user_message}\"\n\n"
    "Return valid JSON only, no extra text:\n"
    '{{"should_save": true/false, "category": "skill|experience|goal|fear|general", '
    '"content": "concise 1-2 sentence knowledge statement"}}\n\n'
    "Only save if the user shared something concrete and personal. "
    "Return should_save=false for vague, short, or one-word responses."
)

OPENING_MESSAGE = (
    "Hey! I'm your UniMind knowledge agent. I'll build your digital profile in 6-8 quick questions — "
    "the sharper your answers, the more accurate your life simulations. "
    "Let's go: what's your name, and what are you currently obsessed with building or figuring out?"
)


async def extract_knowledge(user_message: str) -> dict | None:
    prompt = EXTRACT_PROMPT_TEMPLATE.format(user_message=user_message)
    try:
        raw = await chat_complete(
            [{"role": "user", "content": prompt}],
            temperature=0.2,
            mini=True,
        )
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        if result.get("should_save") and result.get("content"):
            return result
    except Exception:
        pass
    return None


def build_system_prompt(name: str, chunks: list[dict]) -> str:
    chunk_count = len(chunks)
    if chunk_count == 0:
        knowledge_summary = "none yet"
    else:
        lines = [f"- [{c['category']}] {c['content']}" for c in chunks[-10:]]
        knowledge_summary = "\n".join(lines)
    return SYSTEM_PROMPT_TEMPLATE.format(
        name=name,
        chunk_count=chunk_count,
        knowledge_summary=knowledge_summary,
    )


async def build_agent_bio(name: str, chunks: list[dict]) -> str:
    if not chunks:
        return ""
    chunk_text = "\n".join(f"- [{c['category']}] {c['content']}" for c in chunks[:12])
    prompt = (
        f"Based on these knowledge chunks about {name}, write a 2-sentence agent bio "
        "in UniMind's style: cosmic, data-driven, confident. "
        "Focus on what makes them unique in the network.\n\n"
        f"Knowledge:\n{chunk_text}"
    )
    try:
        return await chat_complete([{"role": "user", "content": prompt}], temperature=0.7, mini=True)
    except Exception:
        return f"{name} · Emerging agent in the UniMind knowledge web."


async def enhance_content(brief: str, user_name: str, chunks: list[dict]) -> str:
    """Expand a brief user message into a rich, detailed version for review before sending."""
    context_lines = [f"- [{c['category']}] {c['content']}" for c in chunks[-8:]]
    context_str = "\n".join(context_lines) if context_lines else "No prior knowledge yet."

    prompt = (
        f"The user {user_name} wants to share this brief message with their AI agent interviewer:\n"
        f"\"{brief}\"\n\n"
        f"What they've already shared (for context):\n{context_str}\n\n"
        "Expand this into a rich, specific, first-person statement of 2-4 sentences. "
        "Fill in plausible concrete details (dates, subjects, outcomes, durations) that are consistent "
        "with the brief and their existing profile. Keep the tone natural and personal — not corporate. "
        "Output ONLY the expanded message text, nothing else."
    )
    try:
        return await chat_complete([{"role": "user", "content": prompt}], temperature=0.75, max_tokens=300, mini=True)
    except Exception:
        return brief


async def extract_text_from_file(data: bytes, content_type: str, filename: str) -> tuple[str, str]:
    """Extract readable text from PDF, DOCX, plain text, or image files."""

    # ── Plain text ─────────────────────────────────────────────────────────────
    if content_type == "text/plain":
        try:
            return data.decode("utf-8", errors="replace")[:4000], "text"
        except Exception:
            return "Could not read text file.", "text"

    # ── PDF ────────────────────────────────────────────────────────────────────
    if content_type == "application/pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            pages_text = []
            for page in reader.pages[:20]:
                text = page.extract_text() or ""
                pages_text.append(text)
            combined = "\n".join(pages_text).strip()
            return combined[:4000] if combined else "No readable text found in PDF.", "pdf"
        except Exception as e:
            return f"Could not parse PDF: {e}", "pdf"

    # ── DOCX ───────────────────────────────────────────────────────────────────
    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        try:
            from docx import Document
            doc = Document(io.BytesIO(data))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            combined = "\n".join(paragraphs).strip()
            return combined[:4000] if combined else "No readable text found in document.", "docx"
        except Exception as e:
            return f"Could not parse document: {e}", "docx"

    # ── Images (vision) ────────────────────────────────────────────────────────
    if content_type.startswith("image/"):
        try:
            b64 = base64.b64encode(data).decode("utf-8")
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "This is an image uploaded by a user to their UniMind agent profile. "
                                "Describe what you see in detail — any text, credentials, certificates, "
                                "skills, projects, or personal information visible. Be specific and concise."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{content_type};base64,{b64}"},
                        },
                    ],
                }
            ]
            from services.azure_openai import get_client, DEPLOYMENT
            client = get_client()
            response = await client.chat.completions.create(
                model=DEPLOYMENT,
                messages=messages,
                max_tokens=500,
            )
            return response.choices[0].message.content or "Could not interpret image.", "image"
        except Exception as e:
            return f"Could not process image: {e}", "image"

    return "Unsupported file type.", "unknown"
