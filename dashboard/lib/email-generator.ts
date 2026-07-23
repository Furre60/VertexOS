import type { Business } from "./types";
import { isOffline } from "./types";

/* ------------------------------------------------------------------ *
 * Public types
 * ------------------------------------------------------------------ */

export type EmailVariantKey = "professional" | "friendly" | "short";

export const EMAIL_VARIANTS: { key: EmailVariantKey; label: string }[] = [
  { key: "professional", label: "Professional" },
  { key: "friendly", label: "Friendly" },
  { key: "short", label: "Short & Direct" },
];

export interface GeneratedEmail {
  subject: string;
  body: string;
  /** Sign-off line + sender identity block, kept separate from `body` so
   *  the UI can render/copy it as its own piece. */
  signature: string;
}

export type EmailVariants = Record<EmailVariantKey, GeneratedEmail>;

export interface GenerateEmailsOptions {
  /** Bumped by the "Regenerate" action in the UI. The same lead + the
   *  same variation always produces the same output (this generator is a
   *  pure function of its inputs); a different variation reshuffles
   *  which findings lead the email and how each is worded, without ever
   *  inventing information that isn't in `business`. */
  variation?: number;
  senderName?: string;
  senderTitle?: string;
  senderCompany?: string;
}

const DEFAULT_SENDER_NAME = "Jordan Blake";
const DEFAULT_SENDER_TITLE = "Growth Strategist";
const DEFAULT_SENDER_COMPANY = "VertexOS";

/* ------------------------------------------------------------------ *
 * Sprint 4 → Sprint 5 swap point
 *
 * Today this calls a local, deterministic template engine — no network
 * calls, nothing hardcoded in the UI components. In Sprint 5, swap the
 * single line below for a call to the OpenAI/Anthropic completion API
 * (send it `business` + `options`, ask it to return the same
 * `EmailVariants` shape). Every component under components/dashboard/
 * only ever imports `generateEmailVariants` from this file, so this is
 * the only file that needs to change to switch generators.
 * ------------------------------------------------------------------ */
export async function generateEmailVariants(
  business: Business,
  options: GenerateEmailsOptions = {}
): Promise<EmailVariants> {
  return buildLocalEmailVariants(business, options);
}

/* ------------------------------------------------------------------ *
 * Local deterministic generator
 * ------------------------------------------------------------------ */

interface Insight {
  id: string;
  weight: number;
  /** Short human label used in subject lines, e.g. "online booking". */
  topic: string;
  professional: string[];
  friendly: string[];
  short: string[];
}

function pick<T>(options: readonly T[], seed: number): T {
  const index = ((seed % options.length) + options.length) % options.length;
  return options[index];
}

function hostnameOf(website: string): string {
  if (!website || !website.trim()) return "";
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

function localityOf(business: Business): string {
  if (business.city) return business.city;
  if (business.address) return business.address.split(",")[0].trim();
  return "";
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Builds every applicable finding for this lead. Nothing here is
 *  invented — each insight only fires when the underlying field on
 *  `business` (issues, analysis, score, recommendations) supports it. */
function buildInsights(business: Business): Insight[] {
  const a = business.analysis;
  const host = hostnameOf(business.website);
  const site = host || business.name;
  const place = localityOf(business);
  const insights: Insight[] = [];

  if (isOffline(business)) {
    insights.push({
      id: "offline",
      weight: 100,
      topic: "site uptime",
      professional: [
        `Right now ${site} isn't loading for visitors, so anyone searching for you online${place ? ` in ${place}` : ""} hits a dead end instead of a booking page.`,
        `${business.name}'s site is currently unreachable — every visitor who finds you through search or a shared link right now leaves without a way to book.`,
      ],
      friendly: [
        `Quick heads up — ${site} isn't loading for visitors right now, so people searching for ${business.name} are hitting a dead end.`,
        `Tried pulling up ${business.name}'s site and it's not loading, which means anyone else trying to reach you right now is stuck too.`,
      ],
      short: [
        `${site} is down — visitors can't reach you at all right now.`,
        `${business.name}'s site isn't loading. That's every visitor, lost.`,
      ],
    });
  }

  if (a?.booking === false) {
    insights.push({
      id: "booking",
      weight: 90,
      topic: "online booking",
      professional: [
        `Adding online booking would let visitors reserve a slot the moment they decide to, instead of calling during business hours — that alone typically lifts appointment volume.`,
        `Without a way to book directly on the site, interested visitors have to call or wait for a reply, and a real share of them won't follow through.`,
      ],
      friendly: [
        `One thing that'd make a real difference: letting people book straight from the site instead of calling — a lot of visitors just won't take that extra step.`,
        `Right now booking means picking up the phone, and that bit of friction is enough to lose people who'd otherwise book on the spot.`,
      ],
      short: [
        `No online booking — visitors have to call, and a lot won't.`,
        `Add booking, stop losing visitors who won't call.`,
      ],
    });
  }

  if (a?.https === false) {
    insights.push({
      id: "https",
      weight: 85,
      topic: "site security",
      professional: [
        `The site is still served over plain HTTP, so most browsers flag it "Not Secure" — that warning alone is enough to make a meaningful share of visitors bounce.`,
        `Without HTTPS, browsers actively warn visitors before they even reach the page, which undercuts trust before you've had a chance to make a case.`,
      ],
      friendly: [
        `Browsers are showing a "Not Secure" warning on the site since it's not on HTTPS yet — that scares off more visitors than people expect.`,
        `Getting the site on HTTPS would clear a "Not Secure" warning that's likely turning visitors away before they read a word.`,
      ],
      short: [
        `No HTTPS — browsers flag it "Not Secure" and visitors bounce.`,
        `Site's not on HTTPS. That warning costs you visitors.`,
      ],
    });
  }

  if (a?.responseTimeMs !== undefined && a.responseTimeMs > 900) {
    insights.push({
      id: "speed",
      weight: 75,
      topic: "page load speed",
      professional: [
        `The homepage is currently taking about ${seconds(a.responseTimeMs)} to respond — on mobile especially, delays past a couple seconds are where most visitors give up before the page finishes loading.`,
        `At roughly ${seconds(a.responseTimeMs)} to load, the site is slow enough that a chunk of mobile traffic is leaving before it ever renders.`,
      ],
      friendly: [
        `The site's taking around ${seconds(a.responseTimeMs)} to load right now, which is long enough that mobile visitors won't wait it out.`,
        `Shaving down that ${seconds(a.responseTimeMs)} load time would keep a lot more mobile visitors from bailing early.`,
      ],
      short: [
        `Load time is ~${seconds(a.responseTimeMs)} — mobile visitors won't wait.`,
        `~${seconds(a.responseTimeMs)} load time is losing you mobile traffic.`,
      ],
    });
  }

  if (a?.hasPhoneLink === false) {
    insights.push({
      id: "phone-link",
      weight: 65,
      topic: "contact accessibility",
      professional: [
        `There's no tap-to-call number on the site, so mobile visitors have to copy a number by hand instead of calling directly — a small gap that quietly costs calls.`,
      ],
      friendly: [
        `Adding a tap-to-call number would make it a lot easier for mobile visitors to just call you instead of hunting for the number.`,
      ],
      short: [
        `No tap-to-call link — that's friction on every mobile visit.`,
      ],
    });
  }

  if (a?.hasTestimonials === false) {
    insights.push({
      id: "testimonials",
      weight: 55,
      topic: "trust signals",
      professional: [
        `There's currently no visible reviews or testimonials on the site — that kind of social proof is often what tips a visitor from browsing to booking.`,
      ],
      friendly: [
        `Adding a couple of real reviews to the site would go a long way — right now there's nothing on the page showing new visitors that people trust you.`,
      ],
      short: [
        `No testimonials on-site — that's easy trust you're leaving out.`,
      ],
    });
  }

  if ((a?.images ?? 99) < 5) {
    insights.push({
      id: "images",
      weight: 50,
      topic: "visual trust",
      professional: [
        `With only ${a?.images ?? 0} images on the site, visitors get very little sense of the space or team before deciding whether to reach out — that's an easy trust gap to close.`,
      ],
      friendly: [
        `The site's only got ${a?.images ?? 0} photos right now — a few more of the space or team would help visitors feel like they know you before they even call.`,
      ],
      short: [
        `Only ${a?.images ?? 0} photos on-site — more visuals build trust fast.`,
      ],
    });
  }

  if (a?.forms === 0) {
    insights.push({
      id: "forms",
      weight: 50,
      topic: "lead capture",
      professional: [
        `The site doesn't have a contact form, so the only way to reach out is by phone or email — visitors who'd rather send a quick message have no way to do that.`,
      ],
      friendly: [
        `A simple contact form would catch visitors who'd rather send a quick message than pick up the phone — right now they don't have that option.`,
      ],
      short: [
        `No contact form — visitors who won't call have no way to reach you.`,
      ],
    });
  }

  if (a?.hasEmailLink === false && a?.hasPhoneLink !== false) {
    insights.push({
      id: "email-link",
      weight: 40,
      topic: "contact accessibility",
      professional: [
        `There's no clickable email link on the site, which is a small but real barrier for visitors who'd rather email than call.`,
      ],
      friendly: [
        `A clickable email link would catch the visitors who'd rather write than call — right now that option isn't there.`,
      ],
      short: [
        `No email link on-site for visitors who won't call.`,
      ],
    });
  }

  if (a?.hasPrivacyPolicy === false) {
    insights.push({
      id: "privacy",
      weight: 35,
      topic: "trust & compliance",
      professional: [
        `There's no privacy policy linked on the site — a small omission, but one that gives more cautious visitors a reason to hesitate before submitting any information.`,
      ],
      friendly: [
        `Linking a privacy policy is a quick add that quietly reassures more cautious visitors before they hand over any info.`,
      ],
      short: [
        `No privacy policy linked — an easy trust fix.`,
      ],
    });
  }

  if (a?.hasFaq === false) {
    insights.push({
      id: "faq",
      weight: 30,
      topic: "buyer questions",
      professional: [
        `Without an FAQ section, visitors with common questions about pricing or process have to call to get answers — some will simply leave instead.`,
      ],
      friendly: [
        `An FAQ section would answer the questions visitors are probably leaving with right now instead of calling to ask.`,
      ],
      short: [
        `No FAQ — unanswered questions send visitors elsewhere.`,
      ],
    });
  }

  if (
    a?.externalLinks !== undefined &&
    a?.internalLinks !== undefined &&
    a.externalLinks > 10 &&
    a.externalLinks > a.internalLinks * 2
  ) {
    insights.push({
      id: "link-ratio",
      weight: 45,
      topic: "SEO structure",
      professional: [
        `The site links out to other sites (${a.externalLinks} external links) far more than it links to its own pages (${a.internalLinks}) — that sends both visitors and search authority away instead of deeper into the site.`,
      ],
      friendly: [
        `The site's got a lot more links pointing away (${a.externalLinks}) than pointing to its own pages (${a.internalLinks}) — tightening that up keeps visitors, and search ranking, on your side.`,
      ],
      short: [
        `${a.externalLinks} outbound links vs ${a.internalLinks} internal — that's sending traffic away.`,
      ],
    });
  } else if (a?.internalLinks !== undefined && a.internalLinks < 8) {
    insights.push({
      id: "thin-links",
      weight: 30,
      topic: "SEO structure",
      professional: [
        `With only ${a.internalLinks} internal links, the site gives visitors and search engines very few paths to other pages — that thinness makes it harder to rank and harder to explore.`,
      ],
      friendly: [
        `With just ${a.internalLinks} internal links, there's not much for visitors to click into beyond the homepage — a few more paths through the site would help.`,
      ],
      short: [
        `Only ${a.internalLinks} internal links — a thin site is a hard site to explore.`,
      ],
    });
  }

  // Any recommendation the pipeline already surfaced, in the lead's own
  // words, gets its own value-framed insight.
  if (business.recommendations.length > 0) {
    const rec = business.recommendations[0];
    insights.push({
      id: "recommendation",
      weight: 60,
      topic: "conversion rate",
      professional: [
        `Our audit's top recommendation for the site: ${rec.replace(/\.$/, "")} — a change that maps directly to more visitors completing the booking or contact step.`,
      ],
      friendly: [
        `The biggest lever we found: ${rec.replace(/\.$/, "").toLowerCase()} — a fairly quick fix with an outsized effect on how many visitors actually convert.`,
      ],
      short: [
        `Top fix: ${rec.replace(/\.$/, "").toLowerCase()}.`,
      ],
    });
  }

  // Any flagged issue that isn't already covered by a structured insight
  // above still deserves a mention — reworded as a value statement
  // rather than a raw audit-log line.
  const coveredKeywords = /(book|https|secure|faq|privacy|email|phone|image|photo|form|link|offline|unreachable|down|404)/i;
  const uncoveredIssues = business.issues.filter((issue) => !coveredKeywords.test(issue));
  uncoveredIssues.slice(0, 2).forEach((issue, i) => {
    const cleaned = issue.replace(/\.$/, "");
    insights.push({
      id: `issue-${i}`,
      weight: 25,
      topic: "site health",
      professional: [
        `Our audit also flagged: ${cleaned.toLowerCase()} — worth fixing before it costs more visitors than it already has.`,
      ],
      friendly: [
        `One more thing the audit turned up: ${cleaned.toLowerCase()}. Quick fix, real difference.`,
      ],
      short: [
        `Also flagged: ${cleaned.toLowerCase()}.`,
      ],
    });
  });

  // Fallback for strong sites with nothing structurally wrong: still
  // ground the email in real numbers instead of falling back to filler.
  if (insights.length === 0) {
    const strengths: string[] = [];
    if (a?.booking) strengths.push("online booking already live");
    if (a?.hasTestimonials) strengths.push("testimonials on the page");
    if (a?.https) strengths.push("HTTPS in place");
    const strengthText = strengths.length > 0 ? strengths.join(", ") : "a solid technical foundation";

    insights.push({
      id: "fallback-strength",
      weight: 20,
      topic: "conversion rate",
      professional: [
        `The site is in strong shape overall — ${strengthText} — which means the next gains come from conversion details: CTA placement, mobile speed, and how quickly a visitor reaches the booking step.`,
      ],
      friendly: [
        `Honestly, the site's in good shape — ${strengthText}. The next wins are the small conversion details: where the booking button sits, how fast it loads on mobile, that kind of thing.`,
      ],
      short: [
        `Site's solid — ${strengthText}. Next lever is conversion details.`,
      ],
    });
  }

  return insights;
}

/** Keeps the single most material finding fixed, and rotates the rest of
 *  the selection using `variation` — so "Regenerate" can surface a
 *  different combination of the same lead's real findings. */
function selectInsights(all: Insight[], variation: number, count = 3): Insight[] {
  const sorted = [...all].sort((a, b) => b.weight - a.weight);
  if (sorted.length <= count) return sorted;

  const [top, ...rest] = sorted;
  const offset = variation % rest.length;
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)];
  return [top, ...rotated.slice(0, count - 1)];
}

function subjectLine(
  variant: EmailVariantKey,
  business: Business,
  topic: string,
  variation: number
): string {
  const professional = [
    `${business.name}: closing the ${topic} gap`,
    `A quick note on ${business.name}'s ${topic}`,
    `${topic[0].toUpperCase()}${topic.slice(1)} — a fast win for ${business.name}`,
  ];
  const friendly = [
    `Quick thought on ${business.name}'s ${topic}`,
    `Found a fast win for ${business.name}`,
    `${business.name} + ${topic}: an easy fix`,
  ];
  const short = [
    `${business.name}: ${topic} fix`,
    `Fix ${topic}, gain bookings`,
    `${business.name} — quick ${topic} win`,
  ];

  const pools: Record<EmailVariantKey, string[]> = { professional, friendly, short };
  return pick(pools[variant], variation);
}

function buildBody(
  variant: EmailVariantKey,
  business: Business,
  sentences: string[],
  variation: number
): string {
  if (variant === "short") {
    const line = sentences[0];
    const cta = pick(["Worth a 10-minute call?", "Open to a quick call this week?", "Worth 10 minutes to walk through it?"], variation + 3);
    return [line, cta].join("\n\n");
  }

  if (variant === "friendly") {
    const greeting = pick([`Hey ${business.name} team,`, `Hi there,`], variation + 1);
    const findings = sentences.join(" ");
    const cta = pick(
      [
        "Want me to send over a quick breakdown, or hop on a 10-minute call — whichever's easier?",
        "Let me know if a short call this week works, happy to walk through it.",
      ],
      variation + 5
    );
    return [greeting, findings, cta].join("\n\n");
  }

  // professional
  const greeting = pick([`Hi ${business.name} team,`, `Hello,`], variation + 2);
  const findings = sentences.join(" ");
  const value = pick(
    [
      "Addressing this tends to show up directly in more completed bookings and fewer visitors leaving before they reach out.",
      "Fixing this is usually a fast, contained change with an outsized effect on how many visitors actually convert.",
    ],
    variation + 4
  );
  const cta = pick(
    [
      "Would you have 15 minutes this week to go over the specific fixes and expected impact?",
      "Happy to send the full breakdown over, or set up a short call — whichever's more useful.",
    ],
    variation + 6
  );
  return [greeting, findings, value, cta].join("\n\n");
}

function buildSignature(
  variant: EmailVariantKey,
  variation: number,
  senderName: string,
  senderTitle: string,
  senderCompany: string
): string {
  const closings: Record<EmailVariantKey, string[]> = {
    professional: ["Best regards,", "Best,", "Regards,"],
    friendly: ["Cheers,", "Talk soon,", "Best,"],
    short: ["Thanks,", "—"],
  };
  const closing = pick(closings[variant], variation);
  return [closing, senderName, `${senderTitle}, ${senderCompany}`].join("\n");
}

function buildLocalEmailVariants(business: Business, options: GenerateEmailsOptions): EmailVariants {
  const variation = options.variation ?? 0;
  const senderName = options.senderName ?? DEFAULT_SENDER_NAME;
  const senderTitle = options.senderTitle ?? DEFAULT_SENDER_TITLE;
  const senderCompany = options.senderCompany ?? DEFAULT_SENDER_COMPANY;

  const insights = buildInsights(business);
  const selected = selectInsights(insights, variation, 3);
  const topic = selected[0]?.topic ?? "conversion rate";

  const result = {} as EmailVariants;

  for (const { key } of EMAIL_VARIANTS) {
    const sentences = selected.map((insight) => pick(insight[key], variation));
    result[key] = {
      subject: subjectLine(key, business, topic, variation),
      body: buildBody(key, business, sentences, variation),
      signature: buildSignature(key, variation, senderName, senderTitle, senderCompany),
    };
  }

  return result;
}
