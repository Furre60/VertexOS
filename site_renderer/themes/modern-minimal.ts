export interface Theme {
  id: string;
  /** Raw CSS custom property values, written into :root by compose.ts. */
  cssVariables: {
    background: string;
    foreground: string;
    accent: string;
    muted: string;
  };
}

/**
 * modern-minimal — the only theme in Sprint 6. Clean, high-contrast,
 * restrained accent color. Two more themes (warm-professional,
 * bold-energetic) are added in Sprint 7 alongside per-component layout
 * variants; this file's shape is designed so adding them is a new
 * sibling file plus a registry entry, not a change to this one.
 */
export const modernMinimal: Theme = {
  id: "modern-minimal",
  cssVariables: {
    background: "#ffffff",
    foreground: "#171717",
    accent: "#2563eb",
    muted: "#6b7280",
  },
};
