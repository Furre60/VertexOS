/**
 * compose.ts — turns a SiteSpec JSON file into a real, buildable Next.js
 * project by combining project-template/ with the components and theme
 * the spec selects.
 *
 * Sprint 6 scope: components are selected by type (no layout variants
 * yet - see components-library/Hero's doc comment) and there is exactly
 * one theme. Both are extended in Sprint 7 without changing this file's
 * shape - a variant just becomes another field compose.ts reads off each
 * component entry, and additional themes are just more registry entries.
 *
 * Validation here is deliberately structural only (JSON shape, known
 * component types, known theme id, required props present) - the deeper
 * check of "does this actually compile as a Next.js project" is
 * build/validate.ts, arriving in Sprint 7.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES, type Theme } from "../themes/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_RENDERER_ROOT = resolve(__dirname, "..");
const PROJECT_TEMPLATE_DIR = join(SITE_RENDERER_ROOT, "project-template");
const COMPONENTS_LIBRARY_DIR = join(SITE_RENDERER_ROOT, "components-library");

/**
 * Names to exclude anywhere in the tree when copying project-template.
 * Same rationale as Sprint 5: these are build artifacts / dependency
 * trees each generated project should produce fresh, not inherit.
 */
const COPY_IGNORE = new Set(["node_modules", ".next", "next-env.d.ts"]);

/** One entry per component type known to the renderer. */
interface ComponentDefinition {
  /** Folder name under components-library/ and, once copied, components/. */
  folderName: string;
  /** Prop names that must be present as non-empty strings. */
  requiredProps: string[];
}

const COMPONENT_REGISTRY: Record<string, ComponentDefinition> = {
  hero: {
    folderName: "Hero",
    requiredProps: ["headline", "subheadline", "ctaLabel"],
  },
  about: {
    folderName: "About",
    requiredProps: ["heading", "body"],
  },
  footer: {
    folderName: "Footer",
    requiredProps: ["businessName"],
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

/** Raised for any problem with the input spec itself (not a filesystem/build error). */
export class SiteSpecValidationError extends Error {}

function validateSpec(raw: unknown): SiteSpec {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new SiteSpecValidationError("Site spec must be a JSON object.");
  }
  const spec = raw as Record<string, unknown>;

  if (typeof spec.theme_id !== "string" || spec.theme_id.length === 0) {
    throw new SiteSpecValidationError(
      'Site spec is missing a non-empty string "theme_id".'
    );
  }
  if (!(spec.theme_id in THEMES)) {
    const known = Object.keys(THEMES).join(", ");
    throw new SiteSpecValidationError(
      `Unknown theme_id "${spec.theme_id}". Known themes: ${known}.`
    );
  }

  if (!Array.isArray(spec.components) || spec.components.length === 0) {
    throw new SiteSpecValidationError(
      'Site spec must have a non-empty "components" array.'
    );
  }

  const components: ComponentSpec[] = spec.components.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new SiteSpecValidationError(`components[${index}] must be an object.`);
    }
    const c = entry as Record<string, unknown>;

    if (typeof c.type !== "string" || !(c.type in COMPONENT_REGISTRY)) {
      const known = Object.keys(COMPONENT_REGISTRY).join(", ");
      throw new SiteSpecValidationError(
        `components[${index}] has unknown type "${String(c.type)}". Known types: ${known}.`
      );
    }

    const definition = COMPONENT_REGISTRY[c.type];
    const props = (
      typeof c.props === "object" && c.props !== null && !Array.isArray(c.props)
        ? c.props
        : {}
    ) as Record<string, unknown>;

    for (const requiredProp of definition.requiredProps) {
      const value = props[requiredProp];
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new SiteSpecValidationError(
          `components[${index}] (type "${c.type}") is missing required prop "${requiredProp}" (expected a non-empty string).`
        );
      }
    }

    return { type: c.type, props };
  });

  return { theme_id: spec.theme_id, components };
}

function loadSpec(specPath: string): SiteSpec {
  const resolvedPath = resolve(process.cwd(), specPath);
  if (!existsSync(resolvedPath)) {
    throw new SiteSpecValidationError(`Site spec file not found: ${resolvedPath}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(resolvedPath, "utf-8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SiteSpecValidationError(`Site spec is not valid JSON: ${message}`);
  }

  return validateSpec(raw);
}

function copyProjectTemplate(outputDir: string): void {
  if (!existsSync(PROJECT_TEMPLATE_DIR)) {
    throw new Error(`project-template not found at ${PROJECT_TEMPLATE_DIR}`);
  }
  cpSync(PROJECT_TEMPLATE_DIR, outputDir, {
    recursive: true,
    filter: (src: string) => !COPY_IGNORE.has(basename(src)),
  });
}

/** Copies only the component folders the spec actually uses. */
function copyUsedComponents(spec: SiteSpec, outputDir: string): void {
  const usedTypes = new Set(spec.components.map((c) => c.type));
  const componentsOutDir = join(outputDir, "components");
  mkdirSync(componentsOutDir, { recursive: true });

  for (const type of usedTypes) {
    const definition = COMPONENT_REGISTRY[type];
    const srcDir = join(COMPONENTS_LIBRARY_DIR, definition.folderName);
    const destDir = join(componentsOutDir, definition.folderName);

    if (!existsSync(srcDir)) {
      throw new Error(`Component source not found for type "${type}" at ${srcDir}`);
    }
    cpSync(srcDir, destDir, { recursive: true });
  }
}

/**
 * Renders a prop value as a JSX attribute expression via JSON.stringify.
 * This is correct for any JSON-serializable value (strings, numbers,
 * booleans) with no manual escaping - JSON.stringify already produces a
 * valid JS literal, so `attr={<that literal>}` is always valid TSX.
 */
function jsxAttrValue(value: unknown): string {
  return `{${JSON.stringify(value)}}`;
}

function renderComponentTag(component: ComponentSpec): string {
  const definition = COMPONENT_REGISTRY[component.type];
  const propsAttrs = Object.entries(component.props)
    .map(([key, value]) => `${key}=${jsxAttrValue(value)}`)
    .join(" ");
  return `      <${definition.folderName} ${propsAttrs} />`;
}

function writePage(spec: SiteSpec, outputDir: string): void {
  const usedFolderNames = [
    ...new Set(spec.components.map((c) => COMPONENT_REGISTRY[c.type].folderName)),
  ];
  const imports = usedFolderNames
    .map((name) => `import ${name} from "@/components/${name}";`)
    .join("\n");
  const tags = spec.components.map(renderComponentTag).join("\n");

  const pageSource = `${imports}

/**
 * Generated by site_renderer/build/compose.ts from a SiteSpec.
 * Do not edit by hand - regenerate instead.
 */
export default function Home() {
  return (
    <>
${tags}
    </>
  );
}
`;

  writeFileSync(join(outputDir, "app", "page.tsx"), pageSource, "utf-8");
}

function writeGlobalsCss(theme: Theme, outputDir: string): void {
  const { background, foreground, accent, muted } = theme.cssVariables;

  const css = `@import "tailwindcss";

:root {
  --background: ${background};
  --foreground: ${foreground};
  --accent: ${accent};
  --muted: ${muted};
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
`;

  writeFileSync(join(outputDir, "app", "globals.css"), css, "utf-8");
}

/**
 * Composes a full Next.js project at `output` from the SiteSpec at
 * `specPath`. Throws SiteSpecValidationError for bad input, or a plain
 * Error for filesystem problems (missing template/components, output
 * path collision).
 */
export function composeSite(specPath: string, output: string): void {
  const spec = loadSpec(specPath);
  const theme = THEMES[spec.theme_id];

  const outputDir = resolve(process.cwd(), output);
  if (existsSync(outputDir)) {
    throw new Error(
      `Output path already exists: ${outputDir}\n` +
        "Refusing to overwrite an existing directory - remove it first or choose a different path."
    );
  }
  mkdirSync(outputDir, { recursive: true });

  copyProjectTemplate(outputDir);
  copyUsedComponents(spec, outputDir);
  writeGlobalsCss(theme, outputDir);
  writePage(spec, outputDir);
}
