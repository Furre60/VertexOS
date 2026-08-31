"""demo_generator/context_builder.py — pulls one business's real data
into a GenerationContext, ready to fill the prompt templates.

Adapted to the real VertexOS data model (see the Sprint 8 implementation
summary for the full list of deviations from the original roadmap):
  - Reads data/scored.json directly - there is no SQLite table of
    business/lead data (data/crm.db only holds per-lead CRM metadata:
    favorite/status/notes/last_contacted, keyed by slug).
  - Businesses are identified by `slug`, not a numeric business_id.
    scored.json records don't carry an explicit slug field today, so
    _derive_slug() below reproduces dashboard/lib/data.ts's normalize()
    logic exactly (slugify(name) + "-" + array index, falling back to an
    explicit "slug" key if one is ever added upstream) - the goal is that
    a slug looked up here always means the same record the dashboard
    would show for that slug.
  - Industry is inferred (see industry_profiles.py), not read from a
    field that doesn't exist in this data model.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from demo_generator.industry_profiles import infer_industry

# data/ sits alongside this file's grandparent directory (repo root),
# mirroring dashboard/lib/data.ts's "../data/scored.json relative to the
# app root" convention, just resolved from demo_generator/ instead of
# dashboard/.
REPO_ROOT = Path(__file__).resolve().parent.parent
SCORED_BUSINESSES_PATH = REPO_ROOT / "data" / "scored.json"


class BusinessNotFoundError(Exception):
    """Raised when no record in scored.json resolves to the requested slug."""


def _slugify(name: str) -> str:
    """Byte-for-byte port of dashboard/lib/data.ts's slugify(), so a slug
    computed here always matches the one the dashboard would show for the
    same record."""
    lowered = name.lower().strip()
    hyphenated = re.sub(r"[^a-z0-9]+", "-", lowered)
    return hyphenated.strip("-")


def _derive_slug(record: dict, index: int) -> str:
    """Mirrors dashboard/lib/data.ts's normalize(): prefer an explicit
    "slug" field if the record ever has one, else derive it from the
    name plus the record's position in the file."""
    explicit = record.get("slug")
    if explicit:
        return str(explicit)
    name = record.get("name") or ""
    return f"{_slugify(name)}-{index}"


def _load_scored_businesses() -> list[dict]:
    if not SCORED_BUSINESSES_PATH.exists():
        raise BusinessNotFoundError(
            f"No scored businesses file found at {SCORED_BUSINESSES_PATH}. "
            "Run the scraper -> analyzer -> scorer pipeline first."
        )
    with open(SCORED_BUSINESSES_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    if isinstance(raw, dict) and isinstance(raw.get("businesses"), list):
        return raw["businesses"]
    if isinstance(raw, list):
        return raw
    return []


@dataclass
class GenerationContext:
    """Everything the three prompt templates need, gathered from one
    scored.json record plus inferred industry hints."""

    slug: str
    business_name: str
    website: str | None
    phone: str | None
    email: str | None
    city: str | None
    address: str | None
    score: int
    issues: list[str] = field(default_factory=list)
    analysis: dict = field(default_factory=dict)
    industry_id: str = "general_business"

    def missing_enrichment_fields(self) -> list[str]:
        """Which optional contact/location fields are missing for this
        business - used to decide whether this is a "sparse" record, and
        surfaced in prompts so the AI doesn't invent contact details that
        aren't there."""
        return [
            field_name
            for field_name, value in (
                ("phone", self.phone),
                ("email", self.email),
                ("city", self.city),
                ("address", self.address),
            )
            if not value
        ]


def build_context(slug: str) -> GenerationContext:
    """Finds the scored.json record matching `slug` and builds a
    GenerationContext from it. Raises BusinessNotFoundError if no record
    matches - this is a fast, clear failure the CLI surfaces directly,
    not something the AI pipeline should ever have to work around."""

    records = _load_scored_businesses()

    for index, record in enumerate(records):
        if not isinstance(record, dict):
            continue
        if _derive_slug(record, index) != slug:
            continue

        analysis = record.get("analysis") if isinstance(record.get("analysis"), dict) else {}
        business_name = record.get("name") or slug

        return GenerationContext(
            slug=slug,
            business_name=business_name,
            website=record.get("website") or None,
            phone=record.get("phone") or None,
            email=record.get("email") or (record.get("emails") or [None])[0],
            city=record.get("city") or None,
            address=record.get("address") or None,
            score=int(record.get("score") or 0),
            issues=list(record.get("issues") or []),
            analysis=analysis,
            industry_id=infer_industry(business_name),
        )

    raise BusinessNotFoundError(
        f'No business with slug "{slug}" found in {SCORED_BUSINESSES_PATH}.'
    )


def list_available_slugs() -> list[str]:
    """All slugs currently resolvable from scored.json - mainly useful
    for the CLI's error messages and for picking real slugs to test
    against."""
    records = _load_scored_businesses()
    return [_derive_slug(record, index) for index, record in enumerate(records) if isinstance(record, dict)]
