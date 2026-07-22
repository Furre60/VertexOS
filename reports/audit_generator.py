"""
audit_generator.py

Reads data/scored.json and writes one .txt audit report per business
into reports/output/.

Expected input format (data/scored.json):
[
    {
        "name": "Business Name",
        "website": "https://example.com",
        "score": 72,
        "issues": ["No SSL certificate", "Slow page load time"]
    },
    ...
]
"""

import json
import re
from pathlib import Path
from urllib.parse import urlparse

PROJECT_ROOT = Path(__file__).parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "scored.json"
OUTPUT_DIR = PROJECT_ROOT / "reports" / "output"

# Maps known issue keywords to a recommendation.
RECOMMENDATIONS = {
    "ssl": "Install an SSL certificate to secure the site and build visitor trust.",
    "https": "Migrate the site to HTTPS to protect user data and improve SEO.",
    "mobile": "Make the site mobile-friendly with a responsive design.",
    "responsive": "Make the site mobile-friendly with a responsive design.",
    "slow": "Optimize images and enable caching to speed up page load times.",
    "load time": "Optimize images and enable caching to speed up page load times.",
    "speed": "Optimize images and enable caching to speed up page load times.",
    "seo": "Improve on-page SEO: titles, meta descriptions, and header tags.",
    "meta": "Add proper meta titles and descriptions to improve search visibility.",
    "broken link": "Fix broken links to improve user experience and SEO.",
    "404": "Fix broken links to improve user experience and SEO.",
    "outdated": "Refresh outdated content to keep the site current and relevant.",
    "no contact": "Add a clear contact page or form so customers can reach the business.",
    "contact": "Add a clear contact page or form so customers can reach the business.",
    "no analytics": "Set up analytics (e.g., Google Analytics) to track visitor behavior.",
    "accessibility": "Improve accessibility (alt text, contrast, keyboard navigation).",
    "social": "Add or update social media links to improve engagement.",
    "review": "Encourage more customer reviews to build credibility.",
    "domain": "Consider a custom domain to appear more professional.",
}

DEFAULT_RECOMMENDATION = "Review this issue and address it to improve the site's performance."


def get_recommendation(issue):
    """Return a recommendation for a given issue based on keyword matching."""
    issue_lower = issue.lower()
    for keyword, recommendation in RECOMMENDATIONS.items():
        if keyword in issue_lower:
            return recommendation
    return DEFAULT_RECOMMENDATION


def safe_filename(text):
    """Turn arbitrary text into a filesystem-safe (Linux) slug."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text)
    return text.strip("_")


def website_path_slug(website):
    """Return the last non-empty segment of a website's URL path, if any."""
    if not website:
        return ""
    parsed = urlparse(website)
    segments = [seg for seg in parsed.path.split("/") if seg]
    if not segments:
        return ""
    return safe_filename(segments[-1])


def unique_identifier(business):
    """
    Return a slug to disambiguate businesses that share a name.
    Preference order: address, then website path segment (e.g. "gage-park"),
    then empty (caller falls back to an incrementing number).
    """
    address = business.get("address")
    if address:
        slug = safe_filename(address)
        if slug:
            return slug

    slug = website_path_slug(business.get("website", ""))
    if slug:
        return slug

    return ""


def build_filename(business, used_filenames):
    """
    Build a unique, Linux-safe .txt filename for a business, avoiding
    collisions with any name already in used_filenames.
    """
    base = safe_filename(business.get("name", "")) or "unnamed_business"
    identifier = unique_identifier(business)

    stem = f"{base}_{identifier}" if identifier else base
    filename = f"{stem}.txt"

    # Fall back to (or continue with) an incrementing number if the
    # resulting filename still collides with one already used.
    counter = 2
    while filename in used_filenames:
        filename = f"{stem}_{counter}.txt"
        counter += 1

    used_filenames.add(filename)
    return filename


def build_report(business):
    """Build the text content of a single business's audit report."""
    name = business.get("name", "Unknown Business")
    website = business.get("website", "N/A")
    score = business.get("score", "N/A")
    issues = business.get("issues", [])

    lines = [
        f"AUDIT REPORT: {name}",
        "=" * (14 + len(name)),
        "",
        f"Website: {website}",
        f"Score:   {score}",
        "",
        "Issues:",
    ]

    if issues:
        for issue in issues:
            lines.append(f"  - {issue}")
    else:
        lines.append("  - No issues found.")

    lines.append("")
    lines.append("Recommendations:")

    if issues:
        for issue in issues:
            lines.append(f"  - {get_recommendation(issue)}")
    else:
        lines.append("  - No action needed at this time.")

    lines.append("")
    return "\n".join(lines)


def main():
    if not DATA_FILE.exists():
        print(f"Data file not found: {DATA_FILE}")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        businesses = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    used_filenames = set()
    for business in businesses:
        report = build_report(business)
        filename = build_filename(business, used_filenames)
        filepath = OUTPUT_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Generated: {filepath}")

    print(f"\nDone. {len(businesses)} report(s) written to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()