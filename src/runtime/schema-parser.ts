import { readFile } from "node:fs/promises";
import { z } from "zod";

import type { NexoSchema } from "../types/schema.js";
import { zNexoSchema } from "../types/schema.zod.js";
import { NexoSchemaError } from "./errors.js";

type ParsedNexoSchema = z.infer<typeof zNexoSchema>;

function isRelativeSourcePath(source: string): boolean {
  if (source.startsWith("/") || source.startsWith("\\")) {
    return false;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(source)) {
    return false;
  }

  return !source.startsWith("//");
}

function applyDefaults(schema: ParsedNexoSchema): NexoSchema {
  return {
    ...schema,
    config: {
      ...schema.config,
      port: schema.config.port ?? 3000,
      assets: schema.config.assets ?? [],
    },
  };
}

function validateSourcePaths(schema: NexoSchema, filePath: string): void {
  for (const [name, component] of Object.entries(schema.components)) {
    if (!isRelativeSourcePath(component.source)) {
      throw new NexoSchemaError(
        filePath,
        `components.${name}.source must be a relative path, got "${component.source}"`,
      );
    }
  }
}

function validatePageReferences(schema: NexoSchema, filePath: string): void {
  for (const [route, componentNames] of Object.entries(schema.pages)) {
    for (const componentName of componentNames) {
      if (!(componentName in schema.components)) {
        throw new NexoSchemaError(
          filePath,
          `pages.${route} references unknown component "${componentName}"`,
        );
      }
    }
  }
}

export async function parseSchema(path: string): Promise<NexoSchema> {
  let raw: string;

  try {
    raw = await readFile(path, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NexoSchemaError(path, `Failed to read schema file: ${message}`);
  }

  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NexoSchemaError(path, `Invalid JSON: ${message}`);
  }

  const result = zNexoSchema.safeParse(json);

  if (!result.success) {
    throw NexoSchemaError.fromZod(path, result.error);
  }

  const schema = applyDefaults(result.data);
  validateSourcePaths(schema, path);
  validatePageReferences(schema, path);

  return schema;
}
