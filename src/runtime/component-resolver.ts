import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { ComponentScript, ResolvedComponent } from "../types/component.js";
import type { NexoSchema } from "../types/schema.js";
import { zComponentMeta } from "../types/component.zod.js";
import {
  ComponentMetaError,
  ComponentNotFoundError,
} from "./errors.js";

const componentCache = new Map<string, Promise<ResolvedComponent>>();

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalFile(path: string): Promise<string> {
  if (!(await pathExists(path))) {
    return "";
  }

  return readFile(path, "utf-8");
}

async function loadScript(path: string): Promise<ComponentScript> {
  if (!(await pathExists(path))) {
    return {};
  }

  const module = (await import(pathToFileURL(path).href)) as {
    default?: ComponentScript;
  };

  return module.default ?? {};
}

async function loadComponent(
  name: string,
  sourceDir: string,
): Promise<ResolvedComponent> {
  try {
    const sourceStats = await stat(sourceDir);
    if (!sourceStats.isDirectory()) {
      throw new ComponentNotFoundError(name, sourceDir);
    }
  } catch (error) {
    if (error instanceof ComponentNotFoundError) {
      throw error;
    }

    throw new ComponentNotFoundError(name, sourceDir);
  }

  const htmlPath = join(sourceDir, "component.html");
  const cssPath = join(sourceDir, "style.css");
  const scriptPath = join(sourceDir, "script.js");
  const metaPath = join(sourceDir, "meta.json");

  const [html, css, script, metaRaw] = await Promise.all([
    readFile(htmlPath, "utf-8"),
    readOptionalFile(cssPath),
    loadScript(scriptPath),
    readFile(metaPath, "utf-8"),
  ]);

  let metaJson: unknown;

  try {
    metaJson = JSON.parse(metaRaw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ComponentMetaError(metaPath, `Invalid JSON: ${message}`);
  }

  const metaResult = zComponentMeta.safeParse(metaJson);

  if (!metaResult.success) {
    throw ComponentMetaError.fromZod(metaPath, metaResult.error);
  }

  return {
    name,
    html,
    css,
    script,
    meta: metaResult.data,
  };
}

export function clearComponentCache(): void {
  componentCache.clear();
}

export async function resolveComponent(
  name: string,
  schema: NexoSchema,
  rootDir: string,
): Promise<ResolvedComponent> {
  const componentSchema = schema.components[name];

  if (!componentSchema) {
    throw new ComponentNotFoundError(name, `(not registered in schema)`);
  }

  const absolutePath = resolve(rootDir, componentSchema.source);
  const cached = componentCache.get(absolutePath);

  if (cached) {
    return cached;
  }

  const promise = loadComponent(name, absolutePath);
  componentCache.set(absolutePath, promise);

  return promise;
}
