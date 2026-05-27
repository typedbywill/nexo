import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { ASSET_REGISTRY } from "../runtime/asset-injector.js";
import { resolveComponent } from "../runtime/component-resolver.js";
import { interpolate } from "../runtime/interpolator.js";
import { parseSchema } from "../runtime/schema-parser.js";
import { resolveProps } from "../runtime/prop-resolver.js";
import type { NexoSchema } from "../types/schema.js";
import type { AssetDefinition } from "../types/asset.js";
import { routeToFilename } from "./route-mapper.js";

export interface BuildOptions {
  schemaPath: string;
  outDir: string;
  projectName?: string;
}

export interface BuildResult {
  files: string[];
  durationMs: number;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function collectAssets(schema: NexoSchema, pageComponents: string[]): {
  css: AssetDefinition[];
  js: AssetDefinition[];
} {
  const css: AssetDefinition[] = [];
  const js: AssetDefinition[] = [];
  const seen = new Set<string>();

  function add(name: string): void {
    const definition = ASSET_REGISTRY[name];
    if (!definition || seen.has(definition.url)) {
      return;
    }

    seen.add(definition.url);
    if (definition.type === "css") {
      css.push(definition);
    } else {
      js.push(definition);
    }
  }

  for (const asset of schema.config.assets) {
    add(asset);
  }

  for (const componentName of pageComponents) {
    const componentSchema = schema.components[componentName];
    if (!componentSchema?.assets) {
      continue;
    }

    for (const name of componentSchema.assets.css ?? []) {
      add(name);
    }

    for (const name of componentSchema.assets.js ?? []) {
      add(name);
    }
  }

  return { css, js };
}

function renderAssetTags(assets: {
  css: AssetDefinition[];
  js: AssetDefinition[];
}): string {
  const lines: string[] = [];

  for (const asset of assets.css) {
    lines.push(`  <link rel="stylesheet" href="${asset.url}" />`);
  }

  for (const asset of assets.js) {
    lines.push(`  <script src="${asset.url}" defer></script>`);
  }

  return lines.join("\n");
}

async function buildComponentBlock(
  name: string,
  schema: NexoSchema,
  rootDir: string,
  schemaProps?: Record<string, import("../types/schema.js").PropDefinition>,
): Promise<string> {
  const component = await resolveComponent(name, schema, rootDir);
  const props = resolveProps({}, component.meta, schemaProps);
  const interpolated = interpolate(component.html, props);

  const attrParts = [`name="${escapeAttr(name)}"`];
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === "") {
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        attrParts.push(key);
      }
      continue;
    }

    const serialized =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    attrParts.push(`${key}="${escapeAttr(serialized)}"`);
  }

  return `<nexo-component ${attrParts.join(" ")}>
  <template shadowrootmode="open">
    <style>${component.css}</style>
    ${interpolated}
  </template>
</nexo-component>`;
}

async function buildPageHtml(
  route: string,
  schema: NexoSchema,
  rootDir: string,
): Promise<string> {
  const componentNames = schema.pages[route] ?? [];
  const blocks = await Promise.all(
    componentNames.map((name) =>
      buildComponentBlock(
        name,
        schema,
        rootDir,
        schema.components[name]?.props,
      ),
    ),
  );

  const assets = collectAssets(schema, componentNames);
  const title = schema.config.name;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeAttr(title)}</title>
${renderAssetTags(assets)}
</head>
<body>
${blocks.map((block) => `  ${block}`).join("\n")}
</body>
</html>
`;
}

async function tryCopyLocalAssets(
  rootDir: string,
  outDir: string,
): Promise<void> {
  const assetsDir = join(rootDir, "assets");
  try {
    await cp(assetsDir, join(outDir, "assets"), { recursive: true });
  } catch {
    // optional local assets folder
  }
}

export async function buildStatic(
  options: BuildOptions,
): Promise<BuildResult> {
  const start = Date.now();
  const schemaPath = resolve(options.schemaPath);
  const rootDir = dirname(schemaPath);
  const outDir = resolve(options.outDir);

  const schema = await parseSchema(schemaPath);
  await mkdir(outDir, { recursive: true });

  const files: string[] = [];

  for (const route of Object.keys(schema.pages)) {
    const html = await buildPageHtml(route, schema, rootDir);
    const filename = routeToFilename(route);
    const outputPath = join(outDir, filename);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf-8");
    files.push(outputPath);
  }

  const indexPath = join(rootDir, "index.html");
  try {
    const indexHtml = await readFile(indexPath, "utf-8");
    if (!schema.pages["/"]) {
      await writeFile(join(outDir, "index.html"), indexHtml, "utf-8");
      files.push(join(outDir, "index.html"));
    }
  } catch {
    // no manual index.html
  }

  await tryCopyLocalAssets(rootDir, outDir);

  return {
    files,
    durationMs: Date.now() - start,
  };
}

export async function generateDevHtml(
  route: string,
  schemaPath: string,
  injectLiveReload: boolean,
  wsPort: number,
): Promise<string | null> {
  const schema = await parseSchema(schemaPath);
  const routeKey = route === "" ? "/" : route;

  if (!schema.pages[routeKey]) {
    return null;
  }

  const rootDir = dirname(schemaPath);
  const html = await buildPageHtml(routeKey, schema, rootDir);

  if (!injectLiveReload) {
    return html;
  }

  const script = `
<script>
  const ws = new WebSocket('ws://localhost:${wsPort}');
  ws.onmessage = (e) => {
    const { type, component } = JSON.parse(e.data);
    if (type === 'full-reload') location.reload();
    if (type === 'component-reload' && window.nexo) window.nexo.remount(component);
  };
</script>`;

  return html.replace("</body>", `${script}\n</body>`);
}
