"""Azure OpenAI settings read from environment variables (loaded from backend/.env)."""

import os
from dataclasses import dataclass

from app.ai.errors import AIServiceError

REQUIRED_ENV_VARS = ("AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT")


@dataclass(frozen=True)
class AzureOpenAISettings:
    endpoint: str  # Azure v1 base URL, e.g. https://<resource>.services.ai.azure.com/openai/v1/
    api_key: str
    deployment: str


def load_settings() -> AzureOpenAISettings:
    """Read settings from the environment; raise AIServiceError naming any missing variable."""
    values = {name: os.environ.get(name, "").strip() for name in REQUIRED_ENV_VARS}
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise AIServiceError(f"Missing Azure OpenAI configuration: {', '.join(missing)}")
    return AzureOpenAISettings(
        endpoint=values["AZURE_OPENAI_ENDPOINT"],
        api_key=values["AZURE_OPENAI_API_KEY"],
        deployment=values["AZURE_OPENAI_DEPLOYMENT"],
    )
