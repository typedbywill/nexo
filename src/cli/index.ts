#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";

import { buildStatic } from "../exporter/build.js";
import { startDevServer } from "../dev-server/index.js";
import {
  ComponentNotFoundError,
  NexoSchemaError,
} from "../runtime/errors.js";
import { initProject } from "./init.js";

const VERSION = readPackageVersion();

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function readPackageVersion(): string {
  try {
    const pkgPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../package.json",
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      flags.version = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];

      if (next && !next.startsWith("-")) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }

      continue;
    }

    if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function printHelp(): void {
  console.log(`
${styleText("cyan", "nexo")} — declarative AI-native frontend runtime

${styleText("bold", "Commands:")}
  init <name>    Create a new Nexo project
  dev            Start dev server with hot reload
  build          Generate static HTML export

${styleText("bold", "Flags:")}
  dev:
    --port <n>       Server port (default: from schema or 3000)
    --schema <path>  Path to schema.json (default: ./schema.json)

  build:
    --out <dir>      Output directory (default: ./dist)
    --schema <path>  Path to schema.json (default: ./schema.json)

  --help, -h       Show this help
  --version, -v    Show version
`);
}

function printUserError(error: Error): void {
  console.error(styleText("red", error.message));
}

function printUnknownError(error: unknown): void {
  if (error instanceof Error) {
    console.error(styleText("red", error.message));
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(styleText("red", String(error)));
  }
}

async function runDev(flags: Record<string, string | boolean>): Promise<number> {
  const schemaPath = resolve(
    typeof flags.schema === "string" ? flags.schema : "./schema.json",
  );
  const port =
    typeof flags.port === "string" ? Number(flags.port) : undefined;

  const server = await startDevServer({ schemaPath, port });

  console.log(
    styleText(
      "green",
      `Nexo dev server running at http://localhost:${server.port}`,
    ),
  );
  console.log(
    styleText("dim", `Watching schema.json and components/**/* (ws:${server.wsPort})`),
  );

  await new Promise(() => {
    // keep process alive until signal
  });

  return 0;
}

async function runBuild(flags: Record<string, string | boolean>): Promise<number> {
  const schemaPath = resolve(
    typeof flags.schema === "string" ? flags.schema : "./schema.json",
  );
  const outDir = resolve(
    typeof flags.out === "string" ? flags.out : "./dist",
  );

  console.log(styleText("cyan", "Building..."));

  const result = await buildStatic({ schemaPath, outDir });

  for (const file of result.files) {
    const relative = file.replace(outDir, "").replace(/^\//, "") || file;
    console.log(styleText("green", `✓ ${relative}`));
  }

  console.log(
    styleText("green", `Build complete in ${result.durationMs}ms`),
  );

  return 0;
}

async function runInit(positional: string[]): Promise<number> {
  const name = positional[0];

  if (!name) {
    console.error(styleText("red", "Usage: nexo init <project-name>"));
    return 1;
  }

  const targetDir = resolve(name);
  await initProject(name, targetDir);

  console.log(styleText("green", `✓ Created project "${name}"`));
  console.log(styleText("dim", `  cd ${name} && nexo dev`));

  return 0;
}

async function main(): Promise<number> {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));

  if (flags.version) {
    console.log(`nexo v${VERSION}`);
    return 0;
  }

  if (flags.help) {
    printHelp();
    return 0;
  }

  if (!command) {
    printHelp();
    return 1;
  }

  try {
    switch (command) {
      case "init":
        return await runInit(positional);
      case "dev":
        return await runDev(flags);
      case "build":
        return await runBuild(flags);
      default:
        console.error(styleText("red", `Unknown command: ${command}`));
        printHelp();
        return 1;
    }
  } catch (error) {
    if (
      error instanceof NexoSchemaError ||
      error instanceof ComponentNotFoundError
    ) {
      printUserError(error);
      return 1;
    }

    printUnknownError(error);
    return 2;
  }
}

void main().then((code) => {
  process.exit(code);
});
