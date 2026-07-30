/**
 * compose.ts — turns a SiteSpec JSON file into a real, buildable Next.js
 * project by combining project-template/ with the components and theme
 * the spec selects.
 *
 * Sprint 7 scope: the full ten-component catalog, per-component layout
 * variants (Hero, Pricing), and three themes. Validation is two-layered:
 *
 *   1. Shallow, here in compose.ts, before anything is written to disk:
 *      JSON shape, known component types, known theme, known variants,
 *      required top-level props present, and - new this sprint - only
 *      *known* prop keys accepted (an unrecognized key would otherwise
 *      become a literal, unescaped JSX attribute name when composed,
 *      which is the one part of a generated page that ISN'T protected by
 *      JSON.stringify-based value serialization).
 *   2. Deep, in build/validate.ts, after files are written but before
 *      success is reported: per-item shape of array props (e.g. every
 *      Pricing plan actually has name/price/features), plus a real
 *      TypeScript syntax parse of the generated page.tsx. A failure here
 *      cleans up the partially-written output directory - callers never
 *      see a "successful" render that actually produced broken output.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES, type Theme } from "../themes/index.ts";
import { validateComposedProject } from "./validate.ts";
import {
  COMPONENT_REGISTRY,
  SiteSpecValidationError,
  type ComponentDefinition,
  type ComponentSpec,
  type SiteSpec,
} from "./registry.ts";

export { SiteSpecValidationError };

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

function allowedPropKeys(definition: ComponentDefinition): Set<string> {
  const keys = new Set<string>([
    ...definition.requiredStringProps,
    ...definition.requiredArrayProps,
    ...definition.optionalProps,
  ]);
  if (definition.variants) {
    keys.add("variant");
  }
  return keys;
}

function validateComponentEntry(entry: unknown, index: number): ComponentSpec {
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
  const type = c.type;
  const definition = COMPONENT_REGISTRY[type];

  const props = (
    typeof c.props === "object" && c.props !== null && !Array.isArray(c.props) ? c.props : {}
  ) as Record<string, unknown>;

  const allowed = allowedPropKeys(definition);
  for (const key of Object.keys(props)) {
    if (!allowed.has(key)) {
      const knownKeys = [...allowed].join(", ") || "(none)";
      throw new SiteSpecValidationError(
        `components[${index}] (type "${type}") has unexpected prop "${key}". ` +
          `Accepted props: ${knownKeys}.`
      );
    }
  }

  if ("variant" in props) {
    if (!definition.variants) {
      throw new SiteSpecValidationError(
        `components[${index}] (type "${type}") does not support a "variant".`
      );
    }
    if (
      typeof props.variant !== "string" ||
      !definition.variants.ids.includes(props.variant)
    ) {
      const known = definition.variants.ids.join(", ");
      throw new SiteSpecValidationError(
        `components[${index}] (type "${type}") has unknown variant "${String(props.variant)}". ` +
          `Known variants: ${known}.`
      );
    }
  }

  for (const key of definition.requiredStringProps) {
    const value = props[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new SiteSpecValidationError(
        `components[${index}] (type "${type}") is missing required prop "${key}" (expected a non-empty string).`
      );
    }
  }

  for (const key of definition.requiredArrayProps) {
    const value = props[key];
    if (!Array.isArray(value) || value.length === 0) {
      throw new SiteSpecValidationError(
        `components[${index}] (type "${type}") is missing required prop "${key}" (expected a non-empty array).`
      );
    }
  }

  return { type, props };
}

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

  const components = spec.components.map((entry, index) => validateComponentEntry(entry, index));

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
 * Correct for any JSON-serializable value (strings, numbers, booleans,
 * arrays of objects) with no manual escaping - JSON.stringify already
 * produces a valid JS literal, so `attr={<that literal>}` is always valid
 * TSX regardless of quotes, newlines, or other characters in the value.
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
 * `specPath`. Throws SiteSpecValidationError for bad input (before or
 * after writing - either way, no partial output directory is left
 * behind), or a plain Error for filesystem problems (missing
 * template/components, output path collision).
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

  try {
    copyProjectTemplate(outputDir);
    copyUsedComponents(spec, outputDir);
    writeGlobalsCss(theme, outputDir);
    writePage(spec, outputDir);
    validateComposedProject(spec, outputDir);
  } catch (error) {
    // Never leave a broken directory behind that looks like a successful
    // render - clean up before propagating the failure.
    rmSync(outputDir, { recursive: true, force: true });
    throw error;
  }
}
