import { readFile } from "fs/promises";
import path from "path";
import type { Business } from "./types";

/**
 * VertexOS reads lead-scoring output directly from disk — no database,
 * no mock data. The file is expected at ../data/scored.json relative to
 * this app's project root (i.e. a `data/` folder that sits alongside
 * this app inside your project/monorepo).
 *
 * Expected shape (array of records). Field names are normalized below
 * so common variants (business_name, url, domain, etc.) are accepted
 * without changes to the scoring pipeline.
 *
 * [
 *   {
 *     "slug": "acme-supply-co",            // optional — derived from name if absent
 *     "name": "Acme Supply Co",
 *     "address": "123 Main St, Springfield", // optional
 *     "website": "https://acmesupply.com",
 *     "score": 92,
 *     "issues": ["No visible phone number", "Slow mobile load time"],
 *     "recommendations": ["Add a click-to-call number", "Compress hero image"]
 *   }
 * ]
 */

const DATA_PATH = path.join(process.cwd(), "..", "data", "scored.json");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any, index: number): Business | null {
  if (!raw || typeof raw !== "object") return null;

  const name: string | undefined = raw.name ?? raw.business_name ?? raw.businessName ?? raw.company;
  if (!name) return null;

  const website: string =
    raw.website ?? raw.url ?? raw.domain ?? raw.site ?? "";

  const address: string | undefined =
    raw.address ?? raw.location ?? raw.full_address ?? raw.fullAddress ?? undefined;

  const scoreRaw = raw.score ?? raw.lead_score ?? raw.leadScore ?? 0;
  const score = typeof scoreRaw === "string" ? parseFloat(scoreRaw) : Number(scoreRaw);

  const issues: string[] = Array.isArray(raw.issues)
    ? raw.issues
    : Array.isArray(raw.problems)
      ? raw.problems
      : [];

  const recommendations: string[] = Array.isArray(raw.recommendations)
    ? raw.recommendations
    : Array.isArray(raw.suggestions)
      ? raw.suggestions
      : [];

  const slug: string = raw.slug ? String(raw.slug) : `${slugify(name)}-${index}`;

  return {
    slug,
    name,
    address: address ? String(address) : undefined,
    website,
    score: Number.isFinite(score) ? score : 0,
    issues,
    recommendations,
  };
}

let cache: Business[] | null = null;

export async function getBusinesses(): Promise<Business[]> {
  if (cache) return cache;

  const raw = await readFile(DATA_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const list: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.businesses) ? parsed.businesses : [];

  const businesses = list
    .map((item, i) => normalize(item, i))
    .filter((b): b is Business => b !== null);

  cache = businesses;
  return businesses;
}

export async function getBusinessBySlug(slug: string): Promise<Business | undefined> {
  const businesses = await getBusinesses();
  return businesses.find((b) => b.slug === slug);
}
