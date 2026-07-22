import json

with open("data/leads.json", "r") as f:
    leads = json.load(f)

seen = set()
unique = []

for lead in leads:
    website = (lead.get("website") or "").strip().lower()
    phone = (lead.get("phone") or "").strip()
    name = (lead.get("name") or "").strip().lower()

    # Use website first, then phone, then name
    key = website or phone or name

    if not key:
        continue

    if key in seen:
        continue

    seen.add(key)
    unique.append(lead)

with open("data/leads.json", "w") as f:
    json.dump(unique, f, indent=2)

print(f"Removed {len(leads) - len(unique)} duplicates.")
print(f"Remaining businesses: {len(unique)}")