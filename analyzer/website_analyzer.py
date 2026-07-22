import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

HEADERS = {
    "User-Agent": "Mozilla/5.0 (VertexOS)"
}

BOOKING_WORDS = [
    "book",
    "appointment",
    "schedule",
    "reserve",
    "book now"
]

FAQ_WORDS = [
    "faq",
    "frequently asked questions",
    "f.a.q"
]

TESTIMONIAL_WORDS = [
    "testimonial",
    "testimonials",
    "reviews",
    "what our clients say",
    "what our customers say"
]

PRIVACY_WORDS = [
    "privacy policy",
    "privacy-policy",
    "/privacy"
]

with open("data/enriched.json", "r") as f:
    leads = json.load(f)

results = []

for lead in leads:

    website = lead.get("website")

    if not website:
        continue

    try:

        start = time.monotonic()

        response = requests.get(
            website,
            headers=HEADERS,
            timeout=10
        )

        response_time_ms = round((time.monotonic() - start) * 1000)

        status_code = response.status_code

        soup = BeautifulSoup(response.text, "html.parser")

        title = soup.title.string.strip() if soup.title else None

        description = None
        meta = soup.find("meta", attrs={"name": "description"})
        if meta:
            description = meta.get("content")

        forms = len(soup.find_all("form"))

        images = len(soup.find_all("img"))

        internal = 0
        external = 0

        booking = False
        has_faq = False
        has_testimonials = False
        has_privacy_policy = False
        has_phone_link = False
        has_email_link = False

        domain = urlparse(website).netloc.replace("www.", "")

        # Page text (outside of links) is useful for FAQ / testimonial
        # section detection, since those are often headings rather than links.
        page_text = soup.get_text(" ", strip=True).lower()

        if any(word in page_text for word in FAQ_WORDS):
            has_faq = True

        if any(word in page_text for word in TESTIMONIAL_WORDS):
            has_testimonials = True

        for a in soup.find_all("a", href=True):

            href = a["href"].lower()

            text = a.get_text(" ", strip=True).lower()

            if any(word in href or word in text for word in BOOKING_WORDS):
                booking = True

            if any(word in href or word in text for word in FAQ_WORDS):
                has_faq = True

            if any(word in href or word in text for word in TESTIMONIAL_WORDS):
                has_testimonials = True

            if any(word in href or word in text for word in PRIVACY_WORDS):
                has_privacy_policy = True

            if href.startswith("tel:"):
                has_phone_link = True

            if href.startswith("mailto:"):
                has_email_link = True

            if href.startswith("http"):

                if urlparse(href).netloc.replace("www.", "") == domain:
                    internal += 1
                else:
                    external += 1

            else:
                internal += 1

        analysis = {
            "title": title,
            "description": description,
            "https": website.startswith("https://"),
            "forms": forms,
            "images": images,
            "internal_links": internal,
            "external_links": external,
            "booking": booking,
            "has_faq": has_faq,
            "has_testimonials": has_testimonials,
            "has_privacy_policy": has_privacy_policy,
            "has_phone_link": has_phone_link,
            "has_email_link": has_email_link,
            "response_time_ms": response_time_ms,
            "status_code": status_code
        }

        lead["analysis"] = analysis

        print(f"✓ {lead['name']}")

    except Exception as e:

        analysis = {
            "status": "offline"
        }

        lead["analysis"] = analysis

        print(f"✗ {lead['name']} -> {e}")

    results.append(lead)

with open("data/analyzed.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nFinished.")