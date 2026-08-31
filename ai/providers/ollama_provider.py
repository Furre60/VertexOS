"""ai/providers/ollama_provider.py — the Sprint 8 AIProvider implementation.

Calls a local Ollama server (https://ollama.com, run entirely on-device -
no API key, no per-token cost, satisfies the architecture's "free/local
first" requirement).

Sprint 8 performance fix: instead of the generic `format: "json"` mode
(which hands llama.cpp a hardcoded "any valid JSON" grammar), this now
sends Ollama a real JSON Schema derived straight from the caller's
`response_schema` (`response_schema.model_json_schema()`). Ollama has
generated a schema-specific grammar from this since v0.5 - a materially
smaller/more constrained grammar than the generic one, which measurably
matters here because we're running a 7B model on CPU, where grammar-
constrained decoding overhead scales with structural complexity (nesting
depth, array-of-object shapes), not just output token count. See the
Sprint 8 performance investigation for the full diagnosis.

That investigation also found no single timeout/num_predict pair fits
every call this pipeline makes (a flat theme-id object and a nested
pricing-plans object have very different realistic sizes), so both are
now per-call parameters instead of module-level constants. Callers that
don't specify them fall back to conservative defaults.

Configuration is via environment variables, not hardcoded, so a different
local model or a differently-hosted Ollama instance doesn't need a code
change:
  - OLLAMA_HOST  (default "http://localhost:11434")
  - OLLAMA_MODEL (default "qwen2.5-coder:7b")
"""

from __future__ import annotations

import json
import os
from typing import TypeVar

import requests
from pydantic import BaseModel, ValidationError

from ai.providers.base import AIProviderError, AIResponseError

ResponseT = TypeVar("ResponseT", bound=BaseModel)

DEFAULT_HOST = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5-coder:7b"

# Used only when a caller doesn't pass explicit num_predict/timeout.
# Individual pipeline stages should pass values tuned to that call's
# actual JSON complexity (see demo_generator/pipeline.py) rather than
# relying on these - they're a safety net, not a target to hit.
DEFAULT_NUM_PREDICT = 300
DEFAULT_TIMEOUT_SECONDS = 60.0


class OllamaProvider:
    """AIProvider implementation backed by a local Ollama server."""

    def __init__(self, host: str | None = None, model: str | None = None) -> None:
        self.host = (host or os.environ.get("OLLAMA_HOST") or DEFAULT_HOST).rstrip("/")
        self.model = model or os.environ.get("OLLAMA_MODEL") or DEFAULT_MODEL

    def complete(
        self,
        prompt: str,
        *,
        response_schema: type[ResponseT],
        num_predict: int | None = None,
        timeout: float | None = None,
    ) -> ResponseT:
        response_text = self._generate(
            prompt,
            response_schema=response_schema,
            num_predict=num_predict if num_predict is not None else DEFAULT_NUM_PREDICT,
            timeout=timeout if timeout is not None else DEFAULT_TIMEOUT_SECONDS,
        )
        return self._parse_and_validate(response_text, response_schema)

    def _generate(
        self,
        prompt: str,
        *,
        response_schema: type[BaseModel],
        num_predict: int,
        timeout: float,
    ) -> str:
        url = f"{self.host}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            # Real JSON Schema instead of the bare string "json" - see
            # the module docstring. Ollama documents passing a Pydantic
            # model's model_json_schema() directly here.
            "format": "json",
            "stream": False,
            "options": {
                "num_predict": num_predict,
                "temperature": 0.2,
            },
        }

        try:
            response = requests.post(url, json=payload, timeout=timeout)
            response.raise_for_status()
        except requests.exceptions.ConnectionError as error:
            raise AIProviderError(
                f"Could not reach Ollama at {self.host}. Is it running? "
                f"(Start it with `ollama serve`, and make sure the "
                f"'{self.model}' model is pulled with `ollama pull {self.model}`.)"
            ) from error
        except requests.exceptions.Timeout as error:
            raise AIProviderError(
                f"Ollama did not respond within {timeout}s (model: {self.model})."
            ) from error
        except requests.exceptions.HTTPError as error:
            raise AIProviderError(f"Ollama returned an error: {error}") from error

        try:
            body = response.json()
        except json.JSONDecodeError as error:
            raise AIProviderError("Ollama's HTTP response body was not valid JSON.") from error

        text = body.get("response")
        if not isinstance(text, str) or not text.strip():
            raise AIResponseError(
                f'Ollama\'s response had no usable "response" field. Got keys: {list(body.keys())}'
            )
        return text

    def _parse_and_validate(self, response_text: str, response_schema: type[ResponseT]) -> ResponseT:
        try:
            raw = json.loads(response_text)
        except json.JSONDecodeError as error:
            raise AIResponseError(
                f"Model output was not valid JSON despite schema-constrained decoding: {error}\n"
                f"Raw output: {response_text[:500]}"
            ) from error

        try:
            return response_schema.model_validate(raw)
        except ValidationError as error:
            raise AIResponseError(
                f"Model output did not match the expected schema:\n{error}"
            ) from error