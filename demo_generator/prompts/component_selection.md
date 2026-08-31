You are choosing which page sections a demo website should have for a
local business, and in what order.

Business: {{business_name}}
Industry: {{industry_label}}
Website audit score: {{score}}/100
Known issues with their current site: {{issues}}

Available section types (use these exact ids):
hero, about, services, gallery, pricing, testimonials, faq, cta,
contact, footer.

Rules:
- Always include exactly one "hero" as the first section.
- Always include exactly one "footer" as the last section.
- Choose EXACTLY 5 sections total, including hero and footer.
- Do not repeat a section type.
- Choose sections based on what would help this business convert
  visitors, not a generic template.

IMPORTANT OUTPUT FORMAT:
- Return ONLY valid JSON.
- The "components" value must be an array of strings.
- Each string must be exactly one available section type.
- Do NOT return objects.
- Do NOT include "type" keys.
- Do NOT include "variant" keys.
- Do NOT include any other fields.

Example:

{
  "components": [
    "hero",
    "about",
    "services",
    "contact",
    "footer"
  ]
}