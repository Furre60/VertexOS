/**
 * VertexOS Site Renderer — CLI entry point.
 *
 * Sprint 5 scope: a single `render` command that copies project-template/
 * to an output directory as-is. There is no SiteSpec yet, no component
 * composition, no theming — those arrive in Sprints 6-7. This sprint only
 * proves that the CLI, the template, and the copy mechanism work together
 * and that the result is itself a fully installable/buildable Next.js
 * project.
 *
 * Usage:
 *   node cli.ts render --output <path>
 *
 * (Also runnable via `npm run cli -- render --output <path>`, which uses
 * tsx and works on any supported Node version, including ones older than
 * the Node 22.6+ needed for `node cli.ts` to run TypeScript natively.)
 */

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_TEMPLATE_DIR = resolve(__dirname, "project-template");

/**
 * Names to exclude anywhere in the tree when copying project-template.
 *
 * These are build artifacts and dependency trees, not template source.
 * Every generated demo project installs its own fresh node_modules and
 * produces its own .next output — copying them here would waste time and
 * disk, and risks carrying over stale/machine-specific build state into
 * a "fresh" generated project.
 */
const COPY_IGNORE = new Set(["node_modules", ".next", "next-env.d.ts"]);

interface RenderOptions {
  output: string;
}

function printUsage(): void {
  console.log(`
VertexOS Site Renderer

Usage:
  node cli.ts render --output <path>

Commands:
  render    Produce a Next.js project at <path>.
            Sprint 5: copies project-template/ as-is (no spec yet).

Options:
  --output, -o <path>   Required. Directory to write the project to.
                         Must not already exist.
`);
}

function parseArgs(argv: string[]): { command: string; options: RenderOptions } {
  const [command, ...rest] = argv;

  if (!command) {
    throw new Error("Missing command. Expected: render");
  }

  let output: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--output" || rest[i] === "-o") {
      output = rest[i + 1];
      i++;
    }
  }

  if (!output) {
    throw new Error("Missing required option: --output <path>");
  }

  return { command, options: { output } };
}

function renderCommand(options: RenderOptions): void {
  if (!existsSync(PROJECT_TEMPLATE_DIR)) {
    throw new Error(`project-template not found at ${PROJECT_TEMPLATE_DIR}`);
  }

  const outputDir = resolve(process.cwd(), options.output);

  if (existsSync(outputDir)) {
    throw new Error(
      `Output path already exists: ${outputDir}\n` +
        "Refusing to overwrite an existing directory - remove it first or choose a different path."
    );
  }

  mkdirSync(outputDir, { recursive: true });

  cpSync(PROJECT_TEMPLATE_DIR, outputDir, {
    recursive: true,
    filter: (src: string) => !COPY_IGNORE.has(basename(src)),
  });

  console.log(`Rendered project-template -> ${outputDir}`);
  console.log(`Next steps:\n  cd ${options.output}\n  npm install\n  npm run dev`);
}

function main(): void {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  try {
    const { command, options } = parseArgs(argv);

    switch (command) {
      case "render":
        renderCommand(options);
        break;
      default:
        throw new Error(`Unknown command: "${command}"`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    printUsage();
    process.exit(1);
  }
}

main();
