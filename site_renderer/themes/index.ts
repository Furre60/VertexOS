import { modernMinimal, type Theme } from "./modern-minimal.ts";
import { warmProfessional } from "./warm-professional.ts";
import { boldEnergetic } from "./bold-energetic.ts";

/** All themes available to a SiteSpec's theme_id, keyed by id. */
export const THEMES: Record<string, Theme> = {
  [modernMinimal.id]: modernMinimal,
  [warmProfessional.id]: warmProfessional,
  [boldEnergetic.id]: boldEnergetic,
};

export type { Theme };
