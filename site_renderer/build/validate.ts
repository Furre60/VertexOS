/**
 * validate.ts — the second, more thorough validation pass, run against
 * the files compose.ts has just written, before it reports success.
 *
 * compose.ts's own validateSpec() is shallow by design: it confirms
 * required top-level props are present with the right primitive shape
 * (non-empty string / non-empty array), which is enough to reject most
 * broken input fast and before touching disk. It deliberately does NOT
 * look inside array items (e.g. whether every Pricing plan actually has
 * a name, price, and non-empty features list) - that's this module's
 * job, run once real files exist to check.
 *
 * Two checks, both operating on what was actually composed:
 *   1. deepValidateComponents - re-examines each component's array props
 *      item-by-item against that component's real required sub-fields.
 *   2. checkGeneratedSyntax - parses the generated app/page.tsx with the
 *      TypeScript compiler and fails on any parse error, catching
 *      malformed output regardless of cause (not just bad input).
 */

import { join } from "node:path";
import ts from "typescript";
import { SiteSpecValidationError, type ComponentSpec, type SiteSpec } from "./registry.ts";

/** Per-array-prop item schema: which string fields each item must have. */
interface ArrayItemSchema {
  /** Prop key on the component (e.g. "items", "plans"). */
  propKey: string;
  /** Sub-fields every item must have as a non-empty string. */
  requiredStringFields: string[];
  /** Sub-fields every item must have as a non-empty array of non-empty strings. */
  requiredStringArrayFields: string[];
}

/** Only component types with array props need an entry here. */
const ARRAY_ITEM_SCHEMAS: Record<string, ArrayItemSchema[]> = {
  services: [{ propKey: "items", requiredStringFields: ["name", "description"], requiredStringArrayFields: [] }],
  gallery: [{ propKey: "items", requiredStringFields: ["caption"], requiredStringArrayFields: [] }],
  pricing: [
    {
      propKey: "plans",
      requiredStringFields: ["name", "price"],
      requiredStringArrayFields: ["features"],
    },
  ],
  testimonials: [{ propKey: "items", requiredStringFields: ["quote", "author"], requiredStringArrayFields: [] }],
  faq: [{ propKey: "items", requiredStringFields: ["question", "answer"], requiredStringArrayFields: [] }],
};

function describeComponent(component: ComponentSpec, index: number): string {
  return `components[${index}] (type "${component.type}")`;
}

function deepValidateComponents(spec: SiteSpec): void {
  spec.components.forEach((component, index) => {
    const schemas = ARRAY_ITEM_SCHEMAS[component.type];
    if (!schemas) return;

    for (const schema of schemas) {
      const items = component.props[schema.propKey];
      if (!Array.isArray(items)) continue; // already rejected by compose.ts's shallow check

      items.forEach((item, itemIndex) => {
        if (typeof item !== "object" || item === null || Array.isArray(item)) {
          throw new SiteSpecValidationError(
            `${describeComponent(component, index)}: ${schema.propKey}[${itemIndex}] must be an object.`
          );
        }
        const record = item as Record<string, unknown>;

        for (const field of schema.requiredStringFields) {
          const value = record[field];
          if (typeof value !== "string" || value.trim().length === 0) {
            throw new SiteSpecValidationError(
              `${describeComponent(component, index)}: ${schema.propKey}[${itemIndex}] is missing required field "${field}" (expected a non-empty string).`
            );
          }
        }

        for (const field of schema.requiredStringArrayFields) {
          const value = record[field];
          const isValid =
            Array.isArray(value) &&
            value.length > 0 &&
            value.every((entry) => typeof entry === "string" && entry.trim().length > 0);
          if (!isValid) {
            throw new SiteSpecValidationError(
              `${describeComponent(component, index)}: ${schema.propKey}[${itemIndex}].${field} must be a non-empty array of non-empty strings.`
            );
          }
        }
      });
    }
  });
}

/**
 * Parses the generated page.tsx with the real TypeScript compiler and
 * fails on any syntax error. This needs no installed dependencies (no
 * node_modules in the output directory yet at this point) because parsing
 * is purely syntactic - it doesn't resolve imports or check types against
 * React's/Next's declarations, just confirms the source is well-formed
 * TypeScript/JSX.
 */
function checkGeneratedSyntax(outputDir: string): void {
  const pagePath = join(outputDir, "app", "page.tsx");

  // A minimal single-file Program gives us program.getSyntacticDiagnostics,
  // the public, documented way to get parse errors. Syntactic diagnostics
  // don't require resolving imports or installed types, so this works with
  // no node_modules in outputDir - it's purely "is this well-formed
  // TypeScript/JSX", not "does it type-check against React/Next".
  const program = ts.createProgram([pagePath], {
    target: ts.ScriptTarget.Latest,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
  });

  const sourceFile = program.getSourceFile(pagePath);
  if (!sourceFile) {
    throw new SiteSpecValidationError(`Could not load generated file for syntax check: ${pagePath}`);
  }

  const diagnostics = program.getSyntacticDiagnostics(sourceFile);
  if (diagnostics.length > 0) {
    const messages = diagnostics
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
      .join("; ");
    throw new SiteSpecValidationError(`Generated app/page.tsx has a syntax error: ${messages}`);
  }
}

/**
 * Runs both validation passes against a just-composed project. Throws
 * SiteSpecValidationError on the first problem found; compose.ts is
 * responsible for cleaning up the output directory when this throws.
 */
export function validateComposedProject(spec: SiteSpec, outputDir: string): void {
  deepValidateComponents(spec);
  checkGeneratedSyntax(outputDir);
}
