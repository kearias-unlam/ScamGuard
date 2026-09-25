"""Thin Azure OpenAI client (v1 API, Responses API): sends instructions and input, returns the raw output text."""

from openai import OpenAI, OpenAIError

from app.ai.config import AzureOpenAISettings, load_settings
from app.ai.errors import AIServiceError

TIMEOUT_SECONDS = 60.0
# No retries so the whole call stays within the 60-second budget.
MAX_RETRIES = 0


def build_client(settings: AzureOpenAISettings) -> OpenAI:
    return OpenAI(
        base_url=settings.endpoint,
        api_key=settings.api_key,
        timeout=TIMEOUT_SECONDS,
        max_retries=MAX_RETRIES,
    )


def generate_text(instructions: str, user_input: str, *, client: OpenAI | None = None) -> str:
    """Call the deployment with the Responses API and return output_text. Raise AIServiceError on any failure."""
    settings = load_settings()
    try:
        sdk_client = client if client is not None else build_client(settings)
        response = sdk_client.responses.create(
            model=settings.deployment,
            instructions=instructions,
            input=user_input,
        )
    except OpenAIError as error:
        raise AIServiceError("Azure OpenAI call failed") from error
    text = response.output_text
    if not text.strip():
        raise AIServiceError("Azure OpenAI returned empty output")
    return text
