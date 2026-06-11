"""
Test Azure OpenAI connection using credentials from backend-python/.env
Run from the repo root: python test/test_connection.py
"""
import os
import sys
from pathlib import Path

# Load .env from backend-python/
env_path = Path(__file__).parent.parent / "backend-python" / ".env"
if not env_path.exists():
    print(f"ERROR: .env not found at {env_path}")
    sys.exit(1)

# Parse .env manually (avoids needing python-dotenv installed here)
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            env_vars[key.strip()] = value.strip()

api_key      = env_vars.get("OPENAI_API_KEY", "")
endpoint     = env_vars.get("AZURE_ENDPOINT", "").rstrip("/")
api_version  = env_vars.get("AZURE_API_VERSION", "2024-12-01-preview")
deployment   = env_vars.get("DEPLOYMENT_NAME", "")

print("=" * 60)
print("UniMind — Azure OpenAI Connection Test")
print("=" * 60)
print(f"  Endpoint   : {endpoint}")
print(f"  Deployment : {deployment}")
print(f"  API Version: {api_version}")
print(f"  API Key    : {api_key[:12]}...{api_key[-6:]}")
print("=" * 60)

# ── Method 1: openai.AzureOpenAI (used by the backend) ───────────────────────
print("\n[1] Testing with openai.AzureOpenAI (backend method)...")
try:
    from openai import AzureOpenAI

    client = AzureOpenAI(
        azure_endpoint=endpoint + "/",
        api_key=api_key,
        api_version=api_version,
    )
    response = client.chat.completions.create(
        model=deployment,
        messages=[{"role": "user", "content": "Reply with exactly: CONNECTION OK"}],
        max_completion_tokens=20,
    )
    reply = response.choices[0].message.content or ""
    print(f"  SUCCESS — Model replied: {reply.strip()}")
except Exception as e:
    print(f"  FAILED  — {type(e).__name__}: {e}")

# ── Method 2: openai.OpenAI with base_url (alternative) ─────────────────────
print("\n[2] Testing with openai.OpenAI + base_url (alternative method)...")
try:
    from openai import OpenAI

    client2 = OpenAI(
        base_url=f"{endpoint}/openai/v1",
        api_key=api_key,
    )
    response2 = client2.chat.completions.create(
        model=deployment,
        messages=[{"role": "user", "content": "Reply with exactly: CONNECTION OK"}],
        max_completion_tokens=20,
    )
    reply2 = response2.choices[0].message.content or ""
    print(f"  SUCCESS — Model replied: {reply2.strip()}")
except Exception as e:
    print(f"  FAILED  — {type(e).__name__}: {e}")

print("\n" + "=" * 60)
print("Done.")
