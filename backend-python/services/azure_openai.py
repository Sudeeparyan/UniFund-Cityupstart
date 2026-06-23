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


# ── Model tiering ────────────────────────────────────────────────────────────
# BIG   — high-quality model, used only for final user-facing synthesis.
# MINI  — cheap/fast model, used for routing, extraction, eval, per-expert drafts.
#         Defaults to BIG when MINI_DEPLOYMENT is not configured, so nothing
#         breaks; set MINI_DEPLOYMENT (e.g. gpt-4o-mini / gpt-5-mini) in .env to
#         unlock the cost savings — ~80% of calls then run on the cheap tier.
BIG_DEPLOYMENT = os.getenv("DEPLOYMENT_NAME", "gpt-5-chat")
MINI_DEPLOYMENT = os.getenv("MINI_DEPLOYMENT", BIG_DEPLOYMENT)
DEPLOYMENT = BIG_DEPLOYMENT  # backward-compatible alias

# Some gpt-5-class deployments only accept the default temperature and 400 on a
# custom value. We optimistically forward temperature, and if a deployment
# rejects it we flip this flag off for the rest of the process and retry.
_SUPPORTS_TEMPERATURE = os.getenv("LLM_SUPPORTS_TEMPERATURE", "1") != "0"


def _resolve_model(model: str | None, mini: bool) -> str:
    if model:
        return model
    return MINI_DEPLOYMENT if mini else BIG_DEPLOYMENT


async def chat_complete(
    messages: list[dict],
    temperature: float = 0.8,
    max_tokens: int = 800,
    return_usage: bool = False,
    model: str | None = None,
    mini: bool = False,
):
    """Single entry point for chat completions.

    model — explicit deployment override.
    mini  — when True (and no explicit model), route to the cheap MINI tier.
    temperature is now actually forwarded (it previously was silently dropped),
    with an automatic fallback for deployments that reject custom temperatures.
    """
    global _SUPPORTS_TEMPERATURE
    client = get_client()
    target = _resolve_model(model, mini)

    async def _call(send_temp: bool):
        kwargs = {"model": target, "messages": messages, "max_tokens": max_tokens}
        if send_temp:
            kwargs["temperature"] = temperature
        return await client.chat.completions.create(**kwargs)

    t0 = time.monotonic()
    try:
        response = await _call(_SUPPORTS_TEMPERATURE)
    except Exception as e:
        # If the deployment rejects the temperature param, disable it globally
        # and retry once without it so the call still succeeds.
        if _SUPPORTS_TEMPERATURE and "temperature" in str(e).lower():
            _SUPPORTS_TEMPERATURE = False
            response = await _call(False)
        else:
            raise
    duration_ms = int((time.monotonic() - t0) * 1000)
    content = response.choices[0].message.content or ""
    if return_usage:
        usage = response.usage
        return {
            "content": content,
            "tokens_in": usage.prompt_tokens if usage else 0,
            "tokens_out": usage.completion_tokens if usage else 0,
            "duration_ms": duration_ms,
            "model": target,
        }
    return content


async def simulate_life(user_profile: dict, onboarding: dict, peer_context: str = "") -> str:
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
    if peer_context.strip():
        user_content += (
            "\n\nReal outcomes from people in the network who walked similar paths "
            "(ground your predictions in these — do not invent specifics beyond them):\n"
            + peer_context.strip()
        )

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
