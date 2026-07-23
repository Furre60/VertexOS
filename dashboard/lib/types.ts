export interface Business {
  slug: string;
  name: string;
  address?: string;
  website: string;
  score: number;
  issues: string[];
  recommendations: string[];
}

export type SortKey = "name" | "score";
export type SortDirection = "asc" | "desc";

export type FilterKey = "all" | "high-priority" | "offline" | "no-booking" | "contacted";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high-priority", label: "90+" },
  { key: "offline", label: "Offline" },
  { key: "no-booking", label: "No Booking" },
  { key: "contacted", label: "Contacted" },
];

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
    case "contacted":
      // Not tracked in scored.json yet — placeholder chip, intentionally empty.
      return [];
    case "all":
    default:
      return businesses;
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
