"""ai/providers/base.py — the AI abstraction layer.

Every call site in demo_generator/pipeline.py depends only on this
Protocol, never on a concrete provider. Swapping the backend (Ollama ->
OpenAI/Claude/Gemini, per Sprint 13) means adding a new module here that
satisfies AIProvider and pointing ai/providers/__init__.py's factory at
it - nothing in demo_generator/ changes.

See VertexOS_Sprint5_Generate_Demo_Website_Architecture.md, section 7
("AI Abstraction Layer — The Single-File Swap") for the full rationale.
"""

from __future__ import annotations

from typing import Protocol, TypeVar

from pydantic import BaseModel

ResponseT = TypeVar("ResponseT", bound=BaseModel)


class AIProviderError(Exception):
    """Raised when the provider itself couldn't be reached or failed to
    respond at all (e.g. Ollama isn't running) - distinct from a response
    that came back but didn't match the expected schema, which pipeline.py
    treats as retry-worthy in a different way (see AIResponseError)."""


class AIResponseError(Exception):
    """Raised when a provider responded, but the response wasn't valid
    JSON or didn't match `response_schema`. Distinct from AIProviderError
    so pipeline.py's retry loop can re-prompt with the specific parsing/
    validation problem included, which a connection failure has nothing
    useful to add to."""


class AIProvider(Protocol):
    """The one method every provider must implement.

    `response_schema` is part of the contract itself, not bolted on per
    call site - every provider is responsible for getting the underlying
    model to return JSON matching that schema (via JSON mode, grammar-
    constrained decoding, tool calling, or whatever mechanism that
    backend supports) and for validating it before returning.
    """

    def complete(
        self,
        prompt: str,
        *,
        response_schema: type[ResponseT],
        num_predict: int | None = None,
        timeout: float | None = None,
    ) -> ResponseT: ...
