import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  clearComponentCache,
  resolveComponent,
} from "../../src/runtime/component-resolver.js";
import {
  ComponentMetaError,
  ComponentNotFoundError,
} from "../../src/runtime/errors.js";
import type { NexoSchema } from "../../src/types/schema.js";

const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

function schemaFor(
  components: NexoSchema["components"],
): NexoSchema {
  return {
    config: {
      name: "test",
      port: 3000,
      assets: [],
    },
    pages: {
      "/": Object.keys(components),
    },
    components,
  };
}

describe("resolveComponent", () => {
  it("loads a complete component from tests/fixtures/components/Hero/", async () => {
    const schema = schemaFor({
      Hero: { source: "./components/Hero" },
    });

    const component = await resolveComponent(
      "Hero",
      schema,
      fixturesRoot,
    );

    expect(component.name).toBe("Hero");
    expect(component.html).toContain("{{ title }}");
    expect(component.css).toContain(":host");
    expect(typeof component.script.mounted).toBe("function");
    expect(component.meta.name).toBe("Hero");
    expect(component.meta.props.title?.default).toBe("Bem-vindo");
  });

  it("returns the same instance on a second call (cache hit)", async () => {
    const schema = schemaFor({
      Hero: { source: "./components/Hero" },
    });

    clearComponentCache();

    const first = await resolveComponent("Hero", schema, fixturesRoot);
    const second = await resolveComponent("Hero", schema, fixturesRoot);

    expect(first).toBe(second);
  });

  it("clearComponentCache() forces a re-read", async () => {
    const schema = schemaFor({
      Hero: { source: "./components/Hero" },
    });

    clearComponentCache();

    const first = await resolveComponent("Hero", schema, fixturesRoot);
    clearComponentCache();
    const second = await resolveComponent("Hero", schema, fixturesRoot);

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("throws ComponentNotFoundError when source does not exist", async () => {
    const schema = schemaFor({
      Missing: { source: "./components/DoesNotExist" },
    });

    await expect(
      resolveComponent("Missing", schema, fixturesRoot),
    ).rejects.toBeInstanceOf(ComponentNotFoundError);
  });

  it("throws when meta.json is malformed (delegates to Zod)", async () => {
    const schema = schemaFor({
      BadMeta: { source: "./components/BadMeta" },
    });

    await expect(
      resolveComponent("BadMeta", schema, fixturesRoot),
    ).rejects.toBeInstanceOf(ComponentMetaError);
  });

  it("treats missing style.css / script.js as optional", async () => {
    const schema = schemaFor({
      Minimal: { source: "./components/Minimal" },
    });

    clearComponentCache();

    const component = await resolveComponent(
      "Minimal",
      schema,
      fixturesRoot,
    );

    expect(component.css).toBe("");
    expect(component.script).toEqual({});
  });
});
