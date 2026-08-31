"""demo_generator/industry_profiles.py — industry hint data + inference.

The architecture doc's original design assumed CRM records would carry
an explicit `industry` field. The real data model (data/scored.json) has
no such field, and the real dataset is entirely dental practices - so
this module also does the classification the schema doesn't give us for
free, via lightweight keyword matching against the business name.

Every profile is DATA, not branching code (see the architecture doc,
section 9): adding an industry means adding a dict entry, never a code
change to context_builder.py or pipeline.py. `general_business` has no
keywords and is never matched by infer_industry() directly - it's the
fallback returned when nothing else matches, so an unrecognized or
ambiguous business degrades gracefully instead of failing.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class IndustryProfile:
    id: str
    label: str
    # Substrings matched (case-insensitively) against the business name to
    # infer this industry. Empty for general_business - it's a fallback,
    # never a keyword match target.
    keywords: tuple[str, ...] = field(default_factory=tuple)
    # Tone guidance handed to the copywriting prompt.
    tone: str = "professional and approachable"
    # Content hints for the AI's component-selection/copywriting prompts -
    # illustrative examples, never literal output the model must reuse.
    example_services: tuple[str, ...] = field(default_factory=tuple)


INDUSTRY_PROFILES: dict[str, IndustryProfile] = {
    "dentist": IndustryProfile(
        id="dentist",
        label="Dental Practice",
        keywords=("dental", "dentist", "dds", "dmd", "orthodont", "periodont", "endodont"),
        tone="warm, reassuring, and trustworthy - dental visits can be stressful for patients",
        example_services=("General checkups & cleanings", "Cosmetic dentistry", "Emergency care"),
    ),
    "law_firm": IndustryProfile(
        id="law_firm",
        label="Law Firm",
        keywords=("law", "legal", "attorney", "attorneys", "lawyer", "esq", "llp"),
        tone="authoritative, precise, and calm",
        example_services=("Estate planning", "Business law", "Family law"),
    ),
    "restaurant": IndustryProfile(
        id="restaurant",
        label="Restaurant",
        keywords=("restaurant", "cafe", "café", "bistro", "grill", "kitchen", "eatery", "diner"),
        tone="inviting and appetite-driven",
        example_services=("Dine-in", "Catering", "Private events"),
    ),
    "gym": IndustryProfile(
        id="gym",
        label="Gym / Fitness Studio",
        keywords=("gym", "fitness", "crossfit", "yoga", "pilates", "training", "athletic"),
        tone="high-energy and motivating",
        example_services=("Group classes", "Personal training", "Open gym access"),
    ),
    "general_business": IndustryProfile(
        id="general_business",
        label="General Business",
        keywords=(),
        tone="professional and approachable",
        example_services=("Consultations", "Custom solutions", "Ongoing support"),
    ),
}

FALLBACK_INDUSTRY_ID = "general_business"


def infer_industry(business_name: str) -> str:
    """Returns the best-matching industry id for a business name, or
    FALLBACK_INDUSTRY_ID if nothing matches. Keyword matching only, on
    purpose - it's cheap, deterministic, and easy to extend (see the
    module docstring); it doesn't need to be exhaustive because
    general_business is always a safe landing spot."""

    name_lower = business_name.lower()

    for industry_id, profile in INDUSTRY_PROFILES.items():
        if industry_id == FALLBACK_INDUSTRY_ID:
            continue
        if any(keyword in name_lower for keyword in profile.keywords):
            return industry_id

    return FALLBACK_INDUSTRY_ID


def get_profile(industry_id: str) -> IndustryProfile:
    return INDUSTRY_PROFILES.get(industry_id, INDUSTRY_PROFILES[FALLBACK_INDUSTRY_ID])
