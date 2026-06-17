import os
import time
from openai import AsyncAzureOpenAI
from dotenv import load_dotenv

load_dotenv()

_client: AsyncAzureOpenAI | None = None


def get_client() -> AsyncAzureOpenAI:
    global _client
    if _client is None:
        _client = AsyncAzureOpenAI(
            azure_endpoint=os.getenv("AZURE_ENDPOINT", ""),
            api_key=os.getenv("OPENAI_API_KEY", ""),
            api_version=os.getenv("AZURE_API_VERSION", "2024-12-01-preview"),
        )
    return _client


DEPLOYMENT = os.getenv("DEPLOYMENT_NAME", "gpt-5-chat")


async def chat_complete(
    messages: list[dict],
    temperature: float = 0.8,
    max_tokens: int = 800,
    return_usage: bool = False,
):
    client = get_client()
    t0 = time.monotonic()
    response = await client.chat.completions.create(
        model=DEPLOYMENT,
        messages=messages,
        max_completion_tokens=max_tokens,
    )
    duration_ms = int((time.monotonic() - t0) * 1000)
    content = response.choices[0].message.content or ""
    if return_usage:
        usage = response.usage
        return {
            "content": content,
            "tokens_in": usage.prompt_tokens if usage else 0,
            "tokens_out": usage.completion_tokens if usage else 0,
            "duration_ms": duration_ms,
        }
    return content


async def simulate_life(user_profile: dict, onboarding: dict) -> str:
    system = (
        "You are UniMind's collective intelligence engine — a cosmic AI that has analyzed "
        "2,847 human life trajectories.\n\n"
        "Return ONLY raw valid JSON. No markdown fences, no explanation, no text before or after.\n\n"
        "Output this exact structure:\n"
        '{"paths":['
        '{"title":"The [Archetype]","icon":"single_emoji","probability":integer,'
        '"tagline":"vivid one-liner about this path",'
        '"milestones":['
        '{"month":1,"event":"concrete personal milestone"},'
        '{"month":3,"event":"specific milestone"},'
        '{"month":6,"event":"bold milestone"}],'
        '"agent_match":"ARIA/NOX/VEDA/ORION/LUME — one sentence why they match"},'
        '{"title":"...","icon":"...","probability":integer,"tagline":"...",'
        '"milestones":[{"month":1,"event":"..."},{"month":3,"event":"..."},{"month":6,"event":"..."}],'
        '"agent_match":"..."},'
        '{"title":"...","icon":"...","probability":integer,"tagline":"...",'
        '"milestones":[{"month":1,"event":"..."},{"month":3,"event":"..."},{"month":6,"event":"..."}],'
        '"agent_match":"..."}'
        '],"collective_insight":"poetic one-liner about their overall trajectory"}\n\n'
        "Rules: exactly 3 paths. Probabilities sum to exactly 100. "
        "Be deeply specific to this person — use their actual goals, fears, and knowledge. "
        "Milestones must be concrete actions, not platitudes. Tone: cosmic, confident, direct."
    )

    user_content = (
        f"Name: {user_profile.get('name', 'Unknown')}\n"
        f"Bio: {user_profile.get('bio') or 'Not provided'}\n"
        f"Focus area: {onboarding.get('focus') or 'exploring'}\n"
        f"Primary goal: {onboarding.get('goal') or 'personal growth'}\n"
        f"Biggest fear: {onboarding.get('fear') or 'uncertainty'}"
    )
    knowledge = user_profile.get("knowledge", "").strip()
    if knowledge:
        user_content += f"\n\nWhat they've shared about themselves:\n{knowledge}"

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    result = await chat_complete(messages, temperature=0.82, max_tokens=1500, return_usage=True)
    return result["content"], {
        "tokens_in": result["tokens_in"],
        "tokens_out": result["tokens_out"],
        "duration_ms": result["duration_ms"],
    }
