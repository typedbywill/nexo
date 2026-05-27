import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NexoSchemaError } from "../../src/runtime/errors.js";
import { parseSchema } from "../../src/runtime/schema-parser.js";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/schemas",
);

function fixturePath(name: string): string {
  return path.join(fixturesDir, name);
}

describe("parseSchema", () => {
  it("parses the example schema from docs/DOCUMENTATION.MD §4", async () => {
    const schema = await parseSchema(fixturePath("doc-example.json"));

    expect(schema.config.name).toBe("meu-projeto");
    expect(schema.pages["/"]).toEqual([
      "Hero",
      "Features",
      "Pricing",
      "CTA",
      "Footer",
    ]);
    expect(schema.components.Hero?.props?.title).toEqual({
      type: "string",
      default: "Bem-vindo",
      required: true,
    });
  });

  it("throws NexoSchemaError when config is missing", async () => {
    await expect(parseSchema(fixturePath("missing-config.json"))).rejects.toBeInstanceOf(
      NexoSchemaError,
    );
  });

  it("throws NexoSchemaError when pages is missing", async () => {
    await expect(parseSchema(fixturePath("missing-pages.json"))).rejects.toBeInstanceOf(
      NexoSchemaError,
    );
  });

  it("throws NexoSchemaError for unknown component referenced in a page", async () => {
    await expect(
      parseSchema(fixturePath("unknown-component.json")),
    ).rejects.toMatchObject({
      name: "NexoSchemaError",
      message: expect.stringContaining('unknown component "MissingComponent"'),
    });
  });

  it("throws NexoSchemaError for invalid prop type", async () => {
    await expect(parseSchema(fixturePath("invalid-prop-type.json"))).rejects.toBeInstanceOf(
      NexoSchemaError,
    );
  });

  it("throws NexoSchemaError for non-string source", async () => {
    await expect(parseSchema(fixturePath("non-string-source.json"))).rejects.toBeInstanceOf(
      NexoSchemaError,
    );
  });

  it("throws NexoSchemaError for absolute source path", async () => {
    await expect(parseSchema(fixturePath("absolute-source.json"))).rejects.toMatchObject({
      name: "NexoSchemaError",
      message: expect.stringContaining("components.Hero.source must be a relative path"),
    });
  });

  it("applies default port 3000 when config.port is absent", async () => {
    const schema = await parseSchema(fixturePath("default-port.json"));

    expect(schema.config.port).toBe(3000);
    expect(schema.config.assets).toEqual(["tailwind"]);
  });

  it("returns a value with the exact NexoSchema shape", async () => {
    const schema = await parseSchema(fixturePath("doc-example.json"));

    expect(schema).toMatchSnapshot();
  });
});
