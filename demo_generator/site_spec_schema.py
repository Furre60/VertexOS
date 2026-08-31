"""SiteSpec schema - the JSON contract between the AI content stage
(demo_generator/pipeline.py, Sprint 8) and the deterministic renderer
(site_renderer/, built in Sprints 5-7).

Sprint 7 finalized the full component/variant/theme vocabulary, mirroring
site_renderer/build/registry.ts field-for-field:

  - ThemeId is a closed set of the three themes in site_renderer/themes/.
  - Each component type has its own Props model with `extra="forbid"`,
    matching compose.ts's "unknown prop key is rejected" rule (an
    unrecognized key would become a literal, unescaped JSX attribute name
    if it ever reached the renderer - see compose.ts's module docstring).
  - `variant` only exists on HeroProps and PricingProps, matching the two
    components that actually declared `variants` in registry.ts.
  - Array-of-object props (Services.items, Pricing.plans, ...) are typed
    down to their item shape here, where compose.ts only does that depth
    of checking in build/validate.ts. Pydantic gives us that for free in
    one model instead of a second hand-written pass.

Sprint 8 adds the two functions at the bottom of this file:
  - try_build_site_spec() - the single validation entrypoint pipeline.py's
    retry loop calls, so retry logic doesn't need to know pydantic's
    exception details.
  - default_site_spec() - a deterministic, always-valid fallback used when
    AI generation exhausts its retries, so a hard business never crashes
    the pipeline (see the Sprint 8 implementation summary).

This module is deliberately kept in sync with the Node-side registry by
hand, not by codegen; see the Sprint 7 implementation summary for why
that's an accepted tradeoff for now rather than a Sprint 7 task.

See: VertexOS_Sprint5_Generate_Demo_Website_Architecture.md, section 5
("The Site Spec") and section 9 (Industry Customization) for the
rationale behind keeping this a plain, closed data contract.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from demo_generator.context_builder import GenerationContext

ThemeId = Literal["modern-minimal", "warm-professional", "bold-energetic"]


class StrictModel(BaseModel):
    """Base for all prop models: reject unknown keys, matching compose.ts's
    prop-key allowlist (see this module's docstring)."""

    model_config = ConfigDict(extra="forbid")


# --- Hero -------------------------------------------------------------

class HeroProps(StrictModel):
    headline: str = Field(min_length=1)
    subheadline: str = Field(min_length=1)
    ctaLabel: str = Field(min_length=1)
    ctaHref: str | None = None
    variant: Literal["centered", "split-image"] | None = None


class HeroComponent(StrictModel):
    type: Literal["hero"]
    props: HeroProps


# --- About --------------------------------------------------------------

class AboutProps(StrictModel):
    heading: str = Field(min_length=1)
    body: str = Field(min_length=1)


class AboutComponent(StrictModel):
    type: Literal["about"]
    props: AboutProps


# --- Services -------------------------------------------------------------

class ServiceItem(StrictModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)


class ServicesProps(StrictModel):
    heading: str = Field(min_length=1)
    items: list[ServiceItem] = Field(min_length=1)


class ServicesComponent(StrictModel):
    type: Literal["services"]
    props: ServicesProps


# --- Gallery -------------------------------------------------------------

class GalleryItem(StrictModel):
    caption: str = Field(min_length=1)


class GalleryProps(StrictModel):
    heading: str = Field(min_length=1)
    items: list[GalleryItem] = Field(min_length=1)


class GalleryComponent(StrictModel):
    type: Literal["gallery"]
    props: GalleryProps


# --- Pricing -------------------------------------------------------------

class PricingPlan(StrictModel):
    name: str = Field(min_length=1)
    price: str = Field(min_length=1)
    features: list[str] = Field(min_length=1)


class PricingProps(StrictModel):
    heading: str = Field(min_length=1)
    plans: list[PricingPlan] = Field(min_length=1)
    variant: Literal["cards", "table"] | None = None


class PricingComponent(StrictModel):
    type: Literal["pricing"]
    props: PricingProps


# --- Testimonials ----------------------------------------------------------

class TestimonialItem(StrictModel):
    quote: str = Field(min_length=1)
    author: str = Field(min_length=1)


class TestimonialsProps(StrictModel):
    heading: str = Field(min_length=1)
    items: list[TestimonialItem] = Field(min_length=1)


class TestimonialsComponent(StrictModel):
    type: Literal["testimonials"]
    props: TestimonialsProps


# --- FAQ -------------------------------------------------------------------

class FAQItem(StrictModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)


class FAQProps(StrictModel):
    heading: str = Field(min_length=1)
    items: list[FAQItem] = Field(min_length=1)


class FAQComponent(StrictModel):
    type: Literal["faq"]
    props: FAQProps


# --- CTA -------------------------------------------------------------------

class CTAProps(StrictModel):
    heading: str = Field(min_length=1)
    ctaLabel: str = Field(min_length=1)
    ctaHref: str | None = None


class CTAComponent(StrictModel):
    type: Literal["cta"]
    props: CTAProps


# --- Contact -----------------------------------------------------------

class ContactProps(StrictModel):
    heading: str = Field(min_length=1)
    email: str = Field(min_length=1)
    phone: str | None = None
    address: str | None = None


class ContactComponent(StrictModel):
    type: Literal["contact"]
    props: ContactProps


# --- Footer --------------------------------------------------------------

class FooterProps(StrictModel):
    businessName: str = Field(min_length=1)
    year: int | None = None


class FooterComponent(StrictModel):
    type: Literal["footer"]
    props: FooterProps


# --- The discriminated union + top-level SiteSpec --------------------------

ComponentEntry = Annotated[
    Union[
        HeroComponent,
        AboutComponent,
        ServicesComponent,
        GalleryComponent,
        PricingComponent,
        TestimonialsComponent,
        FAQComponent,
        CTAComponent,
        ContactComponent,
        FooterComponent,
    ],
    Field(discriminator="type"),
]


class SiteSpec(StrictModel):
    """The complete, validated description of one generated demo site.

    This is what an AIProvider (Sprint 8) will eventually be asked to
    produce, and what site_renderer (already built, Sprints 5-7) consumes
    to compose a real Next.js page. The two sides are intentionally
    separate implementations in separate languages (see the architecture
    doc's rationale for the Python/Node split) sharing this one JSON
    shape - this model exists so the Python side has the same contract to
    validate against once Sprint 8 needs to produce one.
    """

    theme_id: ThemeId
    components: list[ComponentEntry] = Field(min_length=1)


# --- Sprint 8: validation-for-retries + a deterministic fallback -----------


def try_build_site_spec(raw: dict) -> SiteSpec:
    """The single entrypoint pipeline.py's retry loop calls to turn a raw
    dict (assembled from the three AI responses) into a validated
    SiteSpec. Raises pydantic.ValidationError on failure - callers that
    want a retry-friendly string can catch it and read str(error), which
    is already a clear, per-field breakdown."""
    return SiteSpec.model_validate(raw)


def default_site_spec(context: "GenerationContext") -> SiteSpec:
    """A deterministic, always-valid SiteSpec used when AI generation
    exhausts its retries. No AI, no network - built entirely from data
    context_builder.py already verified is real (business name, inferred
    industry's tone/example services) plus static copy, so the DoD's
    "hard business... not a crash" guarantee holds even with the AI
    backend completely unavailable.

    Deliberately excludes any component that would require inventing
    contact details, pricing, testimonials, or FAQ content the business
    never provided (pricing, testimonials, faq, contact, gallery) - the
    fallback favors an honest, smaller page over fabricated content.
    """
    from demo_generator.industry_profiles import get_profile

    profile = get_profile(context.industry_id)
    name = context.business_name

    return SiteSpec(
        theme_id="modern-minimal",
        components=[
            HeroComponent(
                type="hero",
                props=HeroProps(
                    headline=name,
                    subheadline=f"A trusted {profile.label.lower()} ready to help you.",
                    ctaLabel="Learn more",
                    variant="centered",
                ),
            ),
            AboutComponent(
                type="about",
                props=AboutProps(
                    heading=f"About {name}",
                    body=(
                        f"{name} is a {profile.label.lower()} committed to serving "
                        "its community with quality and care."
                    ),
                ),
            ),
            ServicesComponent(
                type="services",
                props=ServicesProps(
                    heading="What we offer",
                    items=[
                        ServiceItem(
                            name=service,
                            description=f"Professional {service.lower()}, done right.",
                        )
                        for service in profile.example_services
                    ],
                ),
            ),
            CTAComponent(
                type="cta",
                props=CTAProps(
                    heading="Ready to get started?",
                    ctaLabel="Get in touch",
                ),
            ),
            FooterComponent(
                type="footer",
                props=FooterProps(businessName=name),
            ),
        ],
    )
