import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildStatic } from "../../src/exporter/build.js";
import { routeToFilename } from "../../src/exporter/route-mapper.js";

const fixturesRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

describe("routeToFilename", () => {
  it("maps routes to filenames", () => {
    expect(routeToFilename("/")).toBe("index.html");
    expect(routeToFilename("/sobre")).toBe("sobre.html");
    expect(routeToFilename("/blog/post")).toBe("blog-post.html");
  });
});

describe("buildStatic", () => {
  it("builds index.html with declarative shadow DOM", async () => {
    const outDir = await mkdtemp(path.join(tmpdir(), "nexo-build-"));
    const schemaPath = path.join(fixturesRoot, "schemas/build-example.json");

    try {
      const result = await buildStatic({ schemaPath, outDir });

      expect(result.files.length).toBeGreaterThan(0);

      const indexHtml = await readFile(path.join(outDir, "index.html"), "utf-8");

      expect(indexHtml).toContain('template shadowrootmode="open"');
      expect(indexHtml).toContain("nexo-component");
      expect(indexHtml).not.toContain("WebSocket");
      expect(indexHtml).toContain("Pizza Artesanal");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
