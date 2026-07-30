/**
 * VertexOS Site Renderer — CLI entry point.
 *
 * Sprint 6: `render` now takes a SiteSpec JSON file and composes a real
 * page from it (see build/compose.ts) instead of copying project-template
 * verbatim. The Sprint 5 plain-copy behavior is superseded, not kept
 * alongside it — from here on, every render is spec-driven.
 *
 * Usage:
 *   node cli.ts render <spec-path> --output <path>
 *
 * (Also runnable via `npm run cli -- render <spec-path> --output <path>`,
 * which uses tsx and works on any supported Node version, including ones
 * older than the Node 22.6+ needed for `node cli.ts` to run TypeScript
 * natively.)
 */

import { composeSite, SiteSpecValidationError } from "./build/compose.ts";

interface RenderArgs {
  specPath: string;
  output: string;
}

function printUsage(): void {
  console.log(`
VertexOS Site Renderer

Usage:
  node cli.ts render <spec-path> --output <path>

Commands:
  render <spec-path>   Compose a Next.js project at <path> from the
                        SiteSpec JSON file at <spec-path>.

Options:
  --output, -o <path>   Required. Directory to write the project to.
                         Must not already exist.
`);
}

function parseArgs(argv: string[]): { command: string; args: RenderArgs } {
  const [command, ...rest] = argv;

  if (!command) {
    throw new Error("Missing command. Expected: render");
  }

  let specPath: string | undefined;
  let output: string | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--output" || arg === "-o") {
      output = rest[i + 1];
      i++;
    } else if (!arg.startsWith("-") && specPath === undefined) {
      specPath = arg;
    }
  }

  if (!specPath) {
    throw new Error("Missing required <spec-path> argument.");
  }
  if (!output) {
    throw new Error("Missing required option: --output <path>");
  }

  return { command, args: { specPath, output } };
}

function main(): void {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  try {
    const { command, args } = parseArgs(argv);

    switch (command) {
      case "render":
        composeSite(args.specPath, args.output);
        console.log(`Rendered ${args.specPath} -> ${args.output}`);
        console.log(`Next steps:\n  cd ${args.output}\n  npm install\n  npm run dev`);
        break;
      default:
        throw new Error(`Unknown command: "${command}"`);
    }
  } catch (error) {
    if (error instanceof SiteSpecValidationError) {
      console.error(`Invalid site spec: ${error.message}`);
      process.exit(1);
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    printUsage();
    process.exit(1);
  }
}

main();
