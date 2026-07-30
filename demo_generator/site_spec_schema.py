"""SiteSpec schema — the JSON contract between the AI content stage
(demo_generator/pipeline.py, arriving in Sprint 8) and the deterministic
renderer (site_renderer/, being built in Sprints 5-7).

Sprint 5 scope: define the shape only, kept intentionally minimal. Nothing
in the codebase constructs or consumes a SiteSpec yet - the renderer is
still copying project-template/ verbatim (see site_renderer/cli.ts), and
the AI pipeline doesn't exist until Sprint 8.

The full component/variant/theme vocabulary is finalized in Sprint 7, once
the component library it describes actually exists - defining that
vocabulary ahead of the components it constrains would let the two drift
out of sync. Sprint 8's AI pipeline is deliberately sequenced *after*
Sprint 7 for the same reason: it targets a schema that's already stable.

See: VertexOS_Sprint5_Generate_Demo_Website_Architecture.md, section 5
("The Site Spec") and section 7 (AI Abstraction Layer) for the rationale
behind keeping this a plain data contract, never AI-generated code.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SiteSpec(BaseModel):
    """The complete, validated description of one generated demo site.

    This is what an AIProvider (Sprint 8) will eventually be asked to
    produce, and what site_renderer (Sprint 6+) will eventually consume
    to compose a real Next.js page. Both fields are placeholders for now:

    - `theme_id` will become a constrained choice from the theme catalog
      introduced in Sprint 7 (e.g. "modern-minimal"); it's a plain string
      here because that catalog doesn't exist yet.
    - `components` will become a list of typed, per-component-type models
      (Hero, About, Services, ...) once those components exist in Sprint
      7. It's untyped here for the same reason.

    Both will be tightened (e.g. `theme_id: ThemeId` as an enum,
    `components: list[ComponentSpec]` as a discriminated union) in later
    sprints - narrowing an existing field is a compatible schema change,
    not a rewrite of anything that depends on this module.
    """

    theme_id: str = Field(
        default="",
        description="Placeholder for the Sprint 7 theme catalog choice.",
    )
    components: list[dict] = Field(
        default_factory=list,
        description="Placeholder for the Sprint 7 typed component list.",
    )
