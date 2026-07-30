import { modernMinimal, type Theme } from "./modern-minimal.ts";

/**
 * All themes available to a SiteSpec's theme_id, keyed by id.
 * Sprint 7 adds "warm-professional" and "bold-energetic" here.
 */
export const THEMES: Record<string, Theme> = {
  [modernMinimal.id]: modernMinimal,
};

export type { Theme };
