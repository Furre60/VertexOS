import requests
import json

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

query = """
[out:json][timeout:25];
area["name"="Chicago"]->.searchArea;

(
  node["amenity"="dentist"](area.searchArea);
  way["amenity"="dentist"](area.searchArea);
  relation["amenity"="dentist"](area.searchArea);
);

out center tags;
"""

response = requests.post(
    OVERPASS_URL,
    data=query,
    headers={"User-Agent": "VertexOS/0.1"}
)

data = response.json()

businesses = []

for item in data["elements"]:
    tags = item.get("tags", {})

    businesses.append({
        "name": tags.get("name"),
        "website": tags.get("website"),
        "phone": tags.get("phone"),
        "email": tags.get("email"),
        "city": tags.get("addr:city"),
        "address": " ".join(filter(None, [
            tags.get("addr:housenumber"),
            tags.get("addr:street")
        ]))
    })

with open("data/leads.json", "w") as f:
    json.dump(businesses, f, indent=2)

print(f"Saved {len(businesses)} businesses.")

for business in businesses[:10]:
    print(business)