import json
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

EMAIL_REGEX = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"

with open("data/leads.json", "r") as f:
    leads = json.load(f)

enriched = []

headers = {
    "User-Agent": "Mozilla/5.0 VertexOS"
}

for lead in leads:

    website = lead.get("website")

    if not website:
        continue

    try:

        response = requests.get(
            website,
            headers=headers,
            timeout=10
        )

        soup = BeautifulSoup(response.text, "html.parser")

        text = soup.get_text(" ")

        emails = list(set(re.findall(EMAIL_REGEX, text)))

        facebook = None
        instagram = None
        contact = None

        for a in soup.find_all("a", href=True):

            href = a["href"]

            if "facebook.com" in href:
                facebook = href

            if "instagram.com" in href:
                instagram = href

            if "contact" in href.lower():
                contact = urljoin(website, href)

        lead["emails"] = emails
        lead["facebook"] = facebook
        lead["instagram"] = instagram
        lead["contact_page"] = contact

        print(f"✓ {lead['name']}")

    except Exception as e:

        print(f"✗ {lead['name']} : {e}")

    enriched.append(lead)

with open("data/enriched.json", "w") as f:
    json.dump(enriched, f, indent=2)

print()
print("Done.")