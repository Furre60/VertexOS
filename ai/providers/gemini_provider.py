from __future__ import annotations

import json
import os
import time
from copy import deepcopy
from typing import Any, TypeVar

from google import genai
from pydantic import BaseModel, ValidationError

from ai.providers.base import AIProviderError, AIResponseError

ResponseT = TypeVar("ResponseT", bound=BaseModel)

DEFAULT_MODEL = "gemini-3.6-flash"


def _gemini_schema(model: type[BaseModel]) -> dict[str, Any]:
    """Build a Gemini-compatible JSON schema from a Pydantic model.

    Pydantic emits JSON Schema using `additionalProperties`.
    The Gemini API schema representation used by this SDK does not accept
    that field, so remove it recursively while preserving the rest of the
    schema, including nested definitions and references.
    """

    schema = deepcopy(model.model_json_schema())

    def clean(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                key: clean(item)
                for key, item in value.items()
                if key != "additionalProperties"
            }

        if isinstance(value, list):
            return [clean(item) for item in value]

        return value

    return clean(schema)


class GeminiProvider:
    """AIProvider implementation backed by Google Gemini."""

    def __init__(
        self,
        model: str | None = None,
        api_key: str | None = None,
    ) -> None:
        self.model = (
            model
            or os.environ.get("GEMINI_MODEL")
            or DEFAULT_MODEL
        )

        key = api_key or os.environ.get("GEMINI_API_KEY")

        if not key:
            raise AIProviderError("GEMINI_API_KEY is not set.")

        self.client = genai.Client(api_key=key)

    def complete(
        self,
        prompt: str,
        *,
        response_schema: type[ResponseT],
        num_predict: int | None = None,
        timeout: float | None = None,
    ) -> ResponseT:
        """Generate structured content and validate it with Pydantic."""

        schema = _gemini_schema(response_schema)

        config: dict[str, Any] = {
            "response_mime_type": "application/json",
            "response_schema": schema,
        }

        # Gemini does not use Ollama's num_predict parameter.
        # When None, let Gemini choose an appropriate output length.
        if num_predict is not None:
            config["max_output_tokens"] = num_predict

        attempts = 3
        last_error: Exception | None = None

        for attempt in range(1, attempts + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
                )

            except Exception as error:
                last_error = error

                # Retry transient 429/5xx failures.
                error_text = str(error)

                transient = (
                    "429" in error_text
                    or "RESOURCE_EXHAUSTED" in error_text
                    or "503" in error_text
                    or "UNAVAILABLE" in error_text
                )

                if transient and attempt < attempts:
                    time.sleep(2.0 * attempt)
                    continue

                raise AIProviderError(
                    f"Gemini request failed "
                    f"(model: {self.model}): {error}"
                ) from error

            parsed = getattr(response, "parsed", None)

            if isinstance(parsed, response_schema):
                return parsed

            if parsed is not None:
                try:
                    return response_schema.model_validate(parsed)
                except ValidationError as error:
                    last_error = error

            text = getattr(response, "text", None)

            if isinstance(text, str) and text.strip():
                try:
                    return response_schema.model_validate_json(text)
                except (ValidationError, ValueError) as error:
                    last_error = error

            if attempt < attempts:
                time.sleep(0.75 * attempt)
                continue

            raw = getattr(response, "text", None)

            if last_error is not None:
                raise AIResponseError(
                    "Gemini response did not match the expected schema: "
                    f"{last_error}\n"
                    f"Raw output: {str(raw)[:500]}"
                ) from last_error

            raise AIResponseError(
                "Gemini returned neither a parsed response nor usable text."
            )

        raise AIResponseError("Gemini request failed unexpectedly.")

    def complete_json(
        self,
        prompt: str,
        *,
        num_predict: int | None = None,
    ) -> dict:
        """Generate plain JSON without a Pydantic response schema."""

        config: dict[str, Any] = {
            "response_mime_type": "application/json",
        }

        if num_predict is not None:
            config["max_output_tokens"] = num_predict

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )
        except Exception as error:
            raise AIProviderError(
                f"Gemini request failed "
                f"(model: {self.model}): {error}"
            ) from error

        text = getattr(response, "text", None)

        if not isinstance(text, str) or not text.strip():
            raise AIResponseError(
                "Gemini returned no usable JSON."
            )

        try:
            value = json.loads(text)
        except json.JSONDecodeError as error:
            raise AIResponseError(
                f"Gemini returned invalid JSON: {error}\n"
                f"Raw output: {text[:500]}"
            ) from error

        if not isinstance(value, dict):
            raise AIResponseError(
                "Gemini JSON response was not an object."
            )

        return value
