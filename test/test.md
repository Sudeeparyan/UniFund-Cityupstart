Project endpoint
https://personal-unimind.services.ai.azure.com/api/projects/Personal-unimind

API Key
C13QqEWC20sYk5k1KL9gvWKOgXt7TEadS4vYltJsuhGfescWfXOvJQQJ99CFACfhMk5XJ3w3AAAAACOGgZZL

from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
endpoint = "https://Personal-Unimind.services.ai.azure.com/openai/v1"
deployment_name = "gpt-5.1"
token_provider = get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default")

client = OpenAI(
    base_url=endpoint,
    api_key=token_provider
)

completion = client.chat.completions.create(
    model=deployment_name,
    messages=[
        {
            "role": "user",
            "content": "What is the capital of France?",
        }
    ],
)

print(completion.choices[0].message)