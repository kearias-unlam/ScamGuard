"""Typed error raised by the AI layer for any failure (missing config, SDK error, timeout, invalid output)."""


class AIServiceError(Exception):
    """The AI call failed, timed out, or returned unusable output. The endpoint maps it to 503."""
