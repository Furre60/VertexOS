/**
 * registry.ts — the component catalog and SiteSpec types shared between
 * compose.ts (which writes files) and validate.ts (which checks them).
 *
 * Pulled into its own module so compose.ts and validate.ts can each
 * import from here without importing each other - compose.ts calls
 * validate.ts's validateComposedProject(), so the reverse dependency
 * would be circular if these types lived in compose.ts itself.
 */

/** One entry per component type known to the renderer. */
export interface ComponentDefinition {
  /** Folder name under components-library/ and, once copied, components/. */
  folderName: string;
  /** Prop keys that must be present as non-empty strings. */
  requiredStringProps: string[];
  /** Prop keys that must be present as non-empty arrays (item shape checked in validate.ts). */
  requiredArrayProps: string[];
  /** Prop keys that are accepted if present but not required. */
  optionalProps: string[];
  /** If set, this component accepts a constrained "variant" prop. */
  variants?: { ids: string[]; default: string };
}

export const COMPONENT_REGISTRY: Record<string, ComponentDefinition> = {
  hero: {
    folderName: "Hero",
    requiredStringProps: ["headline", "subheadline", "ctaLabel"],
    requiredArrayProps: [],
    optionalProps: ["ctaHref"],
    variants: { ids: ["centered", "split-image"], default: "centered" },
  },
  about: {
    folderName: "About",
    requiredStringProps: ["heading", "body"],
    requiredArrayProps: [],
    optionalProps: [],
  },
  services: {
    folderName: "Services",
    requiredStringProps: ["heading"],
    requiredArrayProps: ["items"],
    optionalProps: [],
  },
  gallery: {
    folderName: "Gallery",
    requiredStringProps: ["heading"],
    requiredArrayProps: ["items"],
    optionalProps: [],
  },
  pricing: {
    folderName: "Pricing",
    requiredStringProps: ["heading"],
    requiredArrayProps: ["plans"],
    optionalProps: [],
    variants: { ids: ["cards", "table"], default: "cards" },
  },
  testimonials: {
    folderName: "Testimonials",
    requiredStringProps: ["heading"],
    requiredArrayProps: ["items"],
    optionalProps: [],
  },
  faq: {
    folderName: "FAQ",
    requiredStringProps: ["heading"],
    requiredArrayProps: ["items"],
    optionalProps: [],
  },
  cta: {
    folderName: "CTA",
    requiredStringProps: ["heading", "ctaLabel"],
    requiredArrayProps: [],
    optionalProps: ["ctaHref"],
  },
  contact: {
    folderName: "Contact",
    requiredStringProps: ["heading", "email"],
    requiredArrayProps: [],
    optionalProps: ["phone", "address"],
  },
  footer: {
    folderName: "Footer",
    requiredStringProps: ["businessName"],
    requiredArrayProps: [],
    optionalProps: ["year"],
  },
};

export interface ComponentSpec {
  type: string;
  props: Record<string, unknown>;
}

export interface SiteSpec {
  theme_id: string;
  components: ComponentSpec[];
}

/** Raised for any problem with the input spec, or with what it composed to. */
export class SiteSpecValidationError extends Error {}
