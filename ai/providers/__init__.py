"""AI provider factory."""

from __future__ import annotations

import os

from ai.providers.base import AIProvider

_DEFAULT_PROVIDER = "ollama"


def get_provider(
    name: str | None = None,
    **kwargs,
) -> AIProvider:
    provider_name = (
        name
        or os.environ.get("AI_PROVIDER")
        or _DEFAULT_PROVIDER
    ).lower()

    if provider_name == "ollama":
        from ai.providers.ollama_provider import OllamaProvider

        return OllamaProvider(**kwargs)

    if provider_name == "gemini":
        from ai.providers.gemini_provider import GeminiProvider

        return GeminiProvider(**kwargs)

    if provider_name in ("openai", "claude"):
        raise NotImplementedError(
            f'AI_PROVIDER="{provider_name}" is not implemented yet.'
        )

    raise ValueError(
        f'Unknown AI_PROVIDER "{provider_name}". '
        "Known providers: ollama, gemini, openai, claude."
    )
