import json

# Each rule: (predicate, penalty, issue message)
# predicate receives the lead's "analysis" dict and returns True if the
# penalty should apply.
RULES = [
    (lambda a: not a.get("booking"), 20, "No online booking"),
    (lambda a: not a.get("has_faq"), 10, "No FAQ"),
    (lambda a: not a.get("has_testimonials"), 10, "No testimonials"),
    (lambda a: not a.get("has_privacy_policy"), 5, "No privacy policy"),
    (lambda a: not a.get("has_phone_link"), 5, "No phone link"),
    (lambda a: not a.get("has_email_link"), 5, "No email link"),
    (lambda a: a.get("forms", 0) == 0, 15, "No contact form"),
    (lambda a: not a.get("description"), 10, "Missing meta description"),
    (lambda a: a.get("images", 0) < 10, 10, "Very few images"),
    (lambda a: a.get("https") is False, 20, "No HTTPS"),
]

# Response time is tiered rather than a flat yes/no, so it's handled
# separately instead of forcing it into the RULES shape above.
RESPONSE_TIME_TIERS = [
    (3000, 20, "Response time over 3000ms"),
    (1500, 10, "Response time over 1500ms"),
]


def score_lead(analysis):
    """Return (score, issues) for a single lead's analysis dict."""

    if analysis.get("status") == "offline":
        return 0, ["Website offline"]

    score = 100
    issues = []

    for predicate, penalty, message in RULES:
        if predicate(analysis):
            score -= penalty
            issues.append(message)

    response_time = analysis.get("response_time_ms")
    if response_time is not None:
        for threshold, penalty, message in RESPONSE_TIME_TIERS:
            if response_time > threshold:
                score -= penalty
                issues.append(message)
                break  # only the worst tier applies

    return max(score, 0), issues


def main():
    with open("data/analyzed.json", "r") as f:
        leads = json.load(f)

    for lead in leads:
        analysis = lead.get("analysis", {})
        lead["score"], lead["issues"] = score_lead(analysis)

    leads.sort(key=lambda x: x["score"], reverse=True)

    with open("data/scored.json", "w") as f:
        json.dump(leads, f, indent=2)

    print("\nTop Opportunities:\n")
    for lead in leads[:10]:
        print(f"{lead['score']:>3} | {lead['name']}")


if __name__ == "__main__":
    main()