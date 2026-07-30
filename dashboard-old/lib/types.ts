/** Sprint 3: lightweight CRM status, tracked per-lead in SQLite. */
export type LeadStatus = "New" | "Contacted" | "Replied" | "Won" | "Lost";

export const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Replied", "Won", "Lost"];

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as string[]).includes(value);
}

export interface Business {
  slug: string;
  name: string;
  address?: string;
  website: string;
  score: number;
  issues: string[];
  recommendations: string[];
  // CRM fields (Sprint 3) — stored separately in SQLite, merged in at read time.
  favorite: boolean;
  status: LeadStatus;
  notes: string;
  lastContacted: string | null;
}

export type SortKey = "name" | "score";
export type SortDirection = "asc" | "desc";

export type FilterKey =
  | "all"
  | "high-priority"
  | "offline"
  | "no-booking"
  | "favorites"
  | "status-new"
  | "status-contacted"
  | "status-replied"
  | "status-won"
  | "status-lost";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high-priority", label: "90+" },
  { key: "offline", label: "Offline" },
  { key: "no-booking", label: "No Booking" },
  { key: "favorites", label: "⭐ Favorites" },
  { key: "status-new", label: "New" },
  { key: "status-contacted", label: "Contacted" },
  { key: "status-replied", label: "Replied" },
  { key: "status-won", label: "Won" },
  { key: "status-lost", label: "Lost" },
];

const FILTER_STATUS: Partial<Record<FilterKey, LeadStatus>> = {
  "status-new": "New",
  "status-contacted": "Contacted",
  "status-replied": "Replied",
  "status-won": "Won",
  "status-lost": "Lost",
};

export function scoreTier(score: number): "green" | "yellow" | "red" {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  return "red";
}

const OFFLINE_PATTERN = /\b(offline|unreachable|down|404|not found|no website|no site|dead link|expired domain)\b/i;

/** A business is treated as offline if it has no website on file, or its
 *  flagged issues describe the site as unreachable. Purely derived from
 *  the fields already present in scored.json — no extra data source. */
export function isOffline(business: Business): boolean {
  if (!business.website || !business.website.trim()) return true;
  return business.issues.some((issue) => OFFLINE_PATTERN.test(issue));
}

const BOOKING_PATTERN = /\bbooking\b/i;

/** Flags businesses whose issue list mentions booking at all (i.e. the
 *  audit found a booking-related gap). */
export function hasBookingIssue(business: Business): boolean {
  return business.issues.some((issue) => BOOKING_PATTERN.test(issue));
}

export function applyFilter(businesses: Business[], filter: FilterKey): Business[] {
  switch (filter) {
    case "high-priority":
      return businesses.filter((b) => b.score >= 90);
    case "offline":
      return businesses.filter(isOffline);
    case "no-booking":
      return businesses.filter(hasBookingIssue);
    case "favorites":
      return businesses.filter((b) => b.favorite);
    case "all":
      return businesses;
    default: {
      const status = FILTER_STATUS[filter];
      return status ? businesses.filter((b) => b.status === status) : businesses;
    }
  }
}

export interface LeadKpis {
  total: number;
  highPriority: number;
  offline: number;
  averageScore: number;
}

export function computeKpis(businesses: Business[]): LeadKpis {
  const total = businesses.length;
  const highPriority = businesses.filter((b) => b.score >= 90).length;
  const offline = businesses.filter(isOffline).length;
  const averageScore = total > 0 ? businesses.reduce((sum, b) => sum + b.score, 0) / total : 0;

  return { total, highPriority, offline, averageScore };
}
