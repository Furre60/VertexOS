"""demo_generator/pipeline.py — orchestrates the AI calls that turn one
business into a validated SiteSpec, with schema-validation retries and a
deterministic fallback so a hard business never crashes the run.

Runnable standalone:
    python -m demo_generator.pipeline --slug <slug>

Sprint 8 performance fix: copywriting originally used a single Ollama call
covering every selected section. That combined the longest required output
with the deepest nested JSON structure into one expensive CPU-bound call.

Copywriting is now generated one component at a time. Each component gets
its own small Pydantic response schema, which keeps Ollama's constrained
decoding grammar small and predictable.

Flat components such as hero/about/footer use very small schemas, while
list/nested components receive slightly larger per-component budgets.

See the Sprint 8 performance investigation for the full diagnosis this
is based on.
"""

from __future__ import annotations

from typing import Literal

import argparse
import os
import sys
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, ValidationError, create_model

from ai.providers import get_provider
from ai.providers.base import AIProvider, AIProviderError, AIResponseError
from ai.providers.ollama_provider import OllamaProvider
from demo_generator.context_builder import (
    BusinessNotFoundError,
    build_context,
)
from demo_generator.industry_profiles import get_profile
from demo_generator.site_spec_schema import (
    SiteSpec,
    default_site_spec,
    try_build_site_spec,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "fixtures" / "generated"

DEFAULT_MAX_RETRIES = 2

# ---------------------------------------------------------------------------
# Per-stage model routing
#
# Selection is a relatively small structured decision, so it stays on the
# coding-oriented model. Copywriting is routed to qwen3, which performed
# substantially better on the constrained copy schemas during Sprint 8
# testing.
#
# Environment variables override these defaults without requiring code
# changes:
#
#   VERTEXOS_SELECTION_MODEL=qwen2.5-coder:7b
#   VERTEXOS_COPY_MODEL=qwen3:8b
# ---------------------------------------------------------------------------

SELECTION_MODEL = os.environ.get(
    "VERTEXOS_SELECTION_MODEL",
    "qwen2.5-coder:7b",
)

COPY_MODEL = os.environ.get(
    "VERTEXOS_COPY_MODEL",
    "qwen3:8b",
)

# ---------------------------------------------------------------------------
# Per-call num_predict / timeout tuning
#
# These replace one global 120s timeout that was sized for the worst
# case (copywriting) and silently over-generous for everything else.
# Re-measure and adjust on your hardware - these are starting points
# from the Sprint 8 measurements, not guarantees.
# ---------------------------------------------------------------------------

COMPONENT_SELECTION_NUM_PREDICT = 250
COMPONENT_SELECTION_TIMEOUT_SECONDS = 75.0

THEME_SELECTION_NUM_PREDICT = 60
THEME_SELECTION_TIMEOUT_SECONDS = 45.0


# ---------------------------------------------------------------------------
# Per-component copy field guide (prompt text - unchanged from Sprint 8)
# ---------------------------------------------------------------------------

COMPONENT_PROP_GUIDE: dict[str, str] = {
    "hero": '{"headline": str, "subheadline": str, "ctaLabel": str}',
    "about": '{"heading": str, "body": str}',
    "services": (
        '{"heading": str, "items": '
        '[{"name": str, "description": str}, ...]} (3-4 items)'
    ),
    "gallery": (
        '{"heading": str, "items": '
        '[{"caption": str}, ...]} (2-4 items)'
    ),
    "pricing": (
        '{"heading": str, "plans": '
        '[{"name": str, "price": str, "features": [str, ...]}, ...]} '
        "(2-3 plans)"
    ),
    "testimonials": (
        '{"heading": str, "items": '
        '[{"quote": str, "author": str}, ...]} (2-3 items)'
    ),
    "faq": (
        '{"heading": str, "items": '
        '[{"question": str, "answer": str}, ...]} (3-4 items)'
    ),
    "cta": '{"heading": str, "ctaLabel": str}',
    "contact": '{"heading": str, "email": str}',
    "footer": '{"businessName": str}',
}


# ---------------------------------------------------------------------------
# Copy-call schemas (Sprint 8) - one small Pydantic model per component
# type, matching COMPONENT_PROP_GUIDE's fields exactly. These exist
# purely so the copy stage can hand Ollama a real JSON Schema (see
# ai/providers/ollama_provider.py) instead of the generic format="json"
# grammar. They're deliberately separate from site_spec_schema.py's
# Props models: those also carry renderer-only fields (ctaHref, variant)
# that copywriting was never supposed to invent in the first place -
# COMPONENT_PROP_GUIDE already excluded them, this just makes that
# exclusion a real, enforced schema instead of a prose guide.
# ---------------------------------------------------------------------------


class _CopyModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HeroCopy(_CopyModel):
    headline: str = Field(min_length=1)
    subheadline: str = Field(min_length=1)
    ctaLabel: str = Field(min_length=1)


class AboutCopy(_CopyModel):
    heading: str = Field(min_length=1)
    body: str = Field(min_length=1)


class ServiceItemCopy(_CopyModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)


class ServicesCopy(_CopyModel):
    heading: str = Field(min_length=1)
    items: list[ServiceItemCopy] = Field(min_length=3, max_length=3)


class GalleryItemCopy(_CopyModel):
    caption: str = Field(min_length=1)


class GalleryCopy(_CopyModel):
    heading: str = Field(min_length=1)
    items: list[GalleryItemCopy] = Field(min_length=2, max_length=4)


class PricingPlanCopy(_CopyModel):
    name: str = Field(min_length=1)
    price: str = Field(min_length=1)
    features: list[str] = Field(min_length=1)


class PricingCopy(_CopyModel):
    heading: str = Field(min_length=1)
    plans: list[PricingPlanCopy] = Field(min_length=2, max_length=2)


class TestimonialItemCopy(_CopyModel):
    quote: str = Field(min_length=1)
    author: str = Field(min_length=1)


class TestimonialsCopy(_CopyModel):
    heading: str = Field(min_length=1)
    items: list[TestimonialItemCopy] = Field(min_length=2, max_length=3)


class FAQItemCopy(_CopyModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)


class FAQCopy(_CopyModel):
    heading: str = Field(min_length=1)
    items: list[FAQItemCopy] = Field(min_length=3, max_length=4)


class CTACopy(_CopyModel):
    heading: str = Field(min_length=1)
    ctaLabel: str = Field(min_length=1)


class ContactCopy(_CopyModel):
    heading: str = Field(min_length=1)
    email: str = Field(min_length=1)


class FooterCopy(_CopyModel):
    businessName: str = Field(min_length=1)


COPY_PROPS_MODELS: dict[str, type[BaseModel]] = {
    "hero": HeroCopy,
    "about": AboutCopy,
    "services": ServicesCopy,
    "gallery": GalleryCopy,
    "pricing": PricingCopy,
    "testimonials": TestimonialsCopy,
    "faq": FAQCopy,
    "cta": CTACopy,
    "contact": ContactCopy,
    "footer": FooterCopy,
}


# ---------------------------------------------------------------------------
# Per-component copy generation
#
# Each component gets its own small JSON schema and Ollama call.
# This is intentionally NOT grouped: CPU-bound constrained decoding becomes
# dramatically slower as the JSON schema gets larger and more nested.
# ---------------------------------------------------------------------------

COPY_COMPONENT_CONFIG: dict[str, tuple[int, float]] = {
    # Flat schemas — fast
    "hero": (100, 60.0),
    "about": (80, 60.0),
    "cta": (60, 60.0),
    "contact": (60, 60.0),
    "footer": (40, 60.0),

    # Array schemas — more expensive
    "services": (180, 90.0),
    "gallery": (140, 90.0),
    "testimonials": (160, 90.0),
    "faq": (180, 90.0),

    # Nested array schema — most expensive
    "pricing": (180, 100.0),
}


# ---------------------------------------------------------------------------
# Pipeline response shapes
# ---------------------------------------------------------------------------


class SelectedComponent(BaseModel):
    type: str
    variant: str | None = None


class ComponentSelectionResponse(BaseModel):
    components: list[SelectedComponent] = Field(min_length=5, max_length=8)


class GeminiComponentSelectionResponse(BaseModel):
    components: list[
        Literal[
            "hero",
            "about",
            "services",
            "gallery",
            "pricing",
            "testimonials",
            "faq",
            "cta",
            "contact",
            "footer",
        ]
    ] = Field(min_length=5, max_length=8)
def _convert_gemini_selection(
    result: GeminiComponentSelectionResponse,
) -> ComponentSelectionResponse:
    """Convert Gemini's flat component-name response into the
    pipeline's normal SelectedComponent representation.
    """

    return ComponentSelectionResponse(
        components=[
            SelectedComponent(type=component_type)
            for component_type in result.components
        ]
    )


class CopyResponse(BaseModel):
    content: list[dict]


class ThemeResponse(BaseModel):
    theme_id: str


class PipelineError(Exception):
    """Raised when the pipeline cannot produce a usable SiteSpec."""


# ---------------------------------------------------------------------------
# Prompt rendering
# ---------------------------------------------------------------------------


def _render_prompt(template_name: str, **values: str) -> str:
    template_path = PROMPTS_DIR / template_name
    template = template_path.read_text(encoding="utf-8")

    for key, value in values.items():
        template = template.replace("{{" + key + "}}", value)

    return template


def _format_selected_components(
    components: list[SelectedComponent],
) -> str:
    lines: list[str] = []

    for index, component in enumerate(components):
        variant_note = (
            f' (variant: "{component.variant}")'
            if component.variant
            else ""
        )
        lines.append(
            f"{index + 1}. {component.type}{variant_note}"
        )

    return "\n".join(lines)


def _format_component_prop_guide(
    components: list[SelectedComponent],
) -> str:
    used_types = dict.fromkeys(
        component.type for component in components
    )

    lines = [
        f"- {component_type}: "
        f"{COMPONENT_PROP_GUIDE.get(component_type, '(unknown type)')}"
        for component_type in used_types
    ]

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Retry wrapper
# ---------------------------------------------------------------------------


def _complete_with_retry(
    provider: AIProvider,
    prompt: str,
    response_schema: type[BaseModel],
    max_retries: int,
    *,
    num_predict: int | None = None,
    timeout: float | None = None,
) -> BaseModel:
    """Call the provider and retry provider/schema failures.

    max_retries means retries AFTER the initial attempt.

    Example:
        max_retries=0 -> 1 total call
        max_retries=1 -> 2 total calls
        max_retries=2 -> 3 total calls
    """

    current_prompt = prompt
    last_error: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            return provider.complete(
                current_prompt,
                response_schema=response_schema,
                num_predict=num_predict,
                timeout=timeout,
            )

        except (AIResponseError, AIProviderError) as error:
            last_error = error

            if attempt < max_retries:
                current_prompt = (
                    f"{prompt}\n\n"
                    "---\n"
                    "Your previous response was invalid or failed.\n"
                    f"Error: {error}\n\n"
                    "Respond again with ONLY valid JSON matching the "
                    "required shape described above. "
                    "Do not include explanations or markdown."
                )

    assert last_error is not None
    raise last_error


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------


def _assemble_and_validate(
    selection: ComponentSelectionResponse,
    theme: ThemeResponse,
    copy: CopyResponse,
) -> SiteSpec:

    if len(copy.content) != len(selection.components):
        raise ValidationError.from_exception_data(
            "CopyResponse",
            [
                {
                    "type": "value_error",
                    "loc": ("content",),
                    "msg": (
                        f"Expected {len(selection.components)} content entries "
                        f"(one per selected component), "
                        f"got {len(copy.content)}."
                    ),
                    "input": copy.content,
                }
            ],
        )

    components_raw = []

    for selected, entry in zip(
        selection.components,
        copy.content,
    ):
        # `entry` is a single-key dict {selected.type: {...copy fields}},
        # e.g. {"hero": {"headline": ..., ...}} - the shape copywriting.md
        # asks for and _build_copy_group_model() enforces. Unwrap it
        # before merging in `variant`, which comes from component
        # selection, not from the copy stage.
        #
        # (Sprint 8 fix: the previous version iterated `entry.items()`
        # directly without unwrapping, which left the section-type key
        # in merged_props instead of its fields - that fails Props
        # validation below on every successful AI call, silently
        # triggering the deterministic fallback.)
        inner = entry.get(selected.type, {})
        merged_props = dict(inner)

        if selected.variant:
            merged_props["variant"] = selected.variant

        components_raw.append(
            {
                "type": selected.type,
                "props": merged_props,
            }
        )

    return try_build_site_spec(
        {
            "theme_id": theme.theme_id,
            "components": components_raw,
        }
    )


# ---------------------------------------------------------------------------
# Top-level orchestration
# ---------------------------------------------------------------------------


def generate_site_spec(
    slug: str,
    *,
    provider: AIProvider | None = None,
    copy_provider: AIProvider | None = None,
    max_retries: int = DEFAULT_MAX_RETRIES,
) -> tuple[SiteSpec, bool]:
    """Generate a validated SiteSpec.

    Args:
        provider: used for component selection and theme selection.
            Falls back to get_provider(model=SELECTION_MODEL) if not
            given.
        copy_provider: used for all copywriting group calls. Falls back
            to `provider` if that was given (so existing single-provider
            callers/tests are unaffected), otherwise to
            get_provider(model=COPY_MODEL).

    Returns:
        (site_spec, used_fallback)

    AI failures fall back to the deterministic default spec.
    """

    context = build_context(slug)

    # Selection provider:
    #
    # 1. Explicitly injected provider, if supplied.
    # 2. Otherwise create the configured selection provider.
    active_provider = (
        provider
        if provider is not None
        else get_provider()
    )

    # Copy provider:
    #
    # 1. Explicitly injected copy_provider, if supplied.
    # 2. Otherwise reuse the injected provider.
    #    This preserves existing single-provider test fixtures.
    # 3. Otherwise create a separate provider using COPY_MODEL.
    if copy_provider is not None:
        active_copy_provider = copy_provider
    elif provider is not None:
        active_copy_provider = provider
    else:
        active_copy_provider = get_provider()

    industry_profile = get_profile(context.industry_id)

    common_values = dict(
        business_name=context.business_name,
        industry_label=industry_profile.label,
        tone=industry_profile.tone,
        score=str(context.score),
        issues=", ".join(context.issues) or "(none recorded)",
        website=context.website or "(no website on file)",
    )

    try:
        # ---------------------------------------------------------------
        # 1. Component selection
        # ---------------------------------------------------------------

        is_gemini = os.environ.get("AI_PROVIDER", "").lower() == "gemini"

        selection_prompt = _render_prompt(
            "component_selection_gemini.md" if is_gemini else "component_selection.md",
            **common_values,
        )

        if is_gemini:
            gemini_selection = _complete_with_retry(
                active_provider,
                selection_prompt,
                GeminiComponentSelectionResponse,
                max_retries,
                num_predict=None,
                timeout=60.0,
            )

            selection = _convert_gemini_selection(gemini_selection)

        else:
            selection = _complete_with_retry(
                active_provider,
                selection_prompt,
                ComponentSelectionResponse,
                max_retries,
                num_predict=COMPONENT_SELECTION_NUM_PREDICT,
                timeout=COMPONENT_SELECTION_TIMEOUT_SECONDS,
            )

        # ---------------------------------------------------------------
        # 2. Theme selection
        # ---------------------------------------------------------------

        theme_prompt = _render_prompt(
            "theme_selection.md",
            **common_values,
        )

        theme = _complete_with_retry(
            active_provider,
            theme_prompt,
            ThemeResponse,
            max_retries,
            num_predict=None if is_gemini else THEME_SELECTION_NUM_PREDICT,
            timeout=THEME_SELECTION_TIMEOUT_SECONDS,
        )

        # ---------------------------------------------------------------
        # 3. Copywriting - one call per selected component (see module
        # docstring). Each component gets its own small schema so the
        # constrained-decoding grammar stays small and predictable.
        # ---------------------------------------------------------------

        known_contact_parts = [
            f"{label}: {value}"
            for label, value in (
                ("phone", context.phone),
                ("email", context.email),
                ("address", context.address),
                ("city", context.city),
            )
            if value
        ]

        copy_values = dict(
            common_values,
            known_contact_info=(
                ", ".join(known_contact_parts)
                or "(none on file)"
            ),
            missing_fields=(
                ", ".join(context.missing_enrichment_fields())
                or "(none)"
            ),
        )

        copy_content_by_type: dict[str, dict] = {}

        for component in selection.components:
            component_type = component.type

            if component_type not in COPY_PROPS_MODELS:
                raise PipelineError(
                    f"Unknown component type for copy generation: {component_type}"
                )

            num_predict, timeout = COPY_COMPONENT_CONFIG.get(
                component_type,
                (120, 75.0),
            )

            component_prompt = _render_prompt(
                "copywriting.md",
                **dict(
                    copy_values,
                    selected_components=_format_selected_components([component]),
                    component_prop_guide=_format_component_prop_guide([component]),
                ),
            )

            component_schema = COPY_PROPS_MODELS[component_type]

            component_result = _complete_with_retry(
                active_copy_provider,
                component_prompt,
                component_schema,
                max_retries,
                num_predict=None if is_gemini else num_predict,
                timeout=timeout,
            )

            copy_content_by_type[component_type] = component_result.model_dump()

        missing_types = [
            component.type
            for component in selection.components
            if component.type not in copy_content_by_type
        ]
        if missing_types:
            raise PipelineError(
                f"No copy call covered component type(s): {missing_types}. "
                "This means COPY_PROPS_MODELS is missing a type that "
                "COMPONENT_PROP_GUIDE / site_spec_schema.py knows about."
            )

        copy = CopyResponse(
            content=[
                {component.type: copy_content_by_type[component.type]}
                for component in selection.components
            ]
        )

        # ---------------------------------------------------------------
        # 4. Assemble and validate final SiteSpec
        # ---------------------------------------------------------------

        spec = _assemble_and_validate(
            selection,
            theme,
            copy,
        )

        return spec, False

    except (
        AIProviderError,
        AIResponseError,
        ValidationError,
        PipelineError,
    ) as error:

        print(
            f'AI generation failed for "{slug}" after retries '
            f"({error}); falling back to the deterministic default spec.",
            file=sys.stderr,
        )

        return default_site_spec(context), True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a validated SiteSpec JSON for one business."
        )
    )

    parser.add_argument(
        "--slug",
        required=True,
        help=(
            "Business slug "
            "(see context_builder.list_available_slugs())."
        ),
    )

    parser.add_argument(
        "--output",
        default=None,
        help=(
            "Output file path "
            "(default: demo_generator/fixtures/generated/<slug>.json)"
        ),
    )

    parser.add_argument(
        "--provider",
        default=None,
        help="AI_PROVIDER override (default: ollama)",
    )

    parser.add_argument(
        "--max-retries",
        type=int,
        default=DEFAULT_MAX_RETRIES,
    )

    args = parser.parse_args()

    try:
        provider = (
            get_provider(args.provider)
            if args.provider
            else None
        )

        spec, used_fallback = generate_site_spec(
            args.slug,
            provider=provider,
            max_retries=args.max_retries,
        )

    except BusinessNotFoundError as error:
        print(
            f"Error: {error}",
            file=sys.stderr,
        )
        sys.exit(1)

    except (ValueError, NotImplementedError) as error:
        print(
            f"Error: {error}",
            file=sys.stderr,
        )
        sys.exit(1)

    output_path = (
        Path(args.output)
        if args.output
        else DEFAULT_OUTPUT_DIR / f"{args.slug}.json"
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # exclude_none:
    #
    # Optional renderer props such as ctaHref should be omitted
    # instead of emitted as null because the TypeScript renderer
    # expects string | undefined rather than string | null.

    output_path.write_text(
        spec.model_dump_json(
            indent=2,
            exclude_none=True,
        ),
        encoding="utf-8",
    )

    status = (
        "fallback (AI generation failed)"
        if used_fallback
        else "AI-generated"
    )

    print(
        f"Wrote {output_path} "
        f"[{status}, theme={spec.theme_id}, "
        f"{len(spec.components)} components]"
    )


if __name__ == "__main__":
    main()
