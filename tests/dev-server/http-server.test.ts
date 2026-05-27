import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { generateDevHtml } from "../../src/exporter/build.js";

describe("generateDevHtml", () => {
  it("injects live-reload script in dev mode", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "nexo-dev-html-"));

    try {
      const schema = {
        config: { name: "dev", port: 3000, assets: [] },
        pages: { "/": ["Hero"] },
        components: {
          Hero: { source: "./components/Hero", props: {} },
        },
      };

      await writeFile(
        path.join(dir, "schema.json"),
        JSON.stringify(schema),
        "utf-8",
      );
      await mkdir(path.join(dir, "components/Hero"), { recursive: true });
      await writeFile(path.join(dir, "components/Hero/component.html"), "<p>Hi</p>");
      await writeFile(path.join(dir, "components/Hero/meta.json"), JSON.stringify({
        name: "Hero",
        props: {},
      }));
      await writeFile(path.join(dir, "components/Hero/style.css"), "");

      const html = await generateDevHtml(
        "/",
        path.join(dir, "schema.json"),
        true,
        3001,
      );

      expect(html).toContain("WebSocket");
      expect(html).toContain("ws://localhost:3001");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("serves static files with correct content type", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "nexo-static-"));

    try {
      await writeFile(path.join(dir, "style.css"), "body {}", "utf-8");

      const content = await new Promise<{ type?: string; body: string }>(
        (resolve, reject) => {
          const server = createServer(async (req, res) => {
            const filePath = path.join(dir, req.url?.slice(1) ?? "");
            const { readFile } = await import("node:fs/promises");
            const data = await readFile(filePath, "utf-8");
            res.writeHead(200, { "Content-Type": "text/css" });
            res.end(data);
            server.close();
            resolve({ type: res.getHeader("Content-Type")?.toString(), body: data });
          });

          server.listen(0, () => {
            const address = server.address();
            if (!address || typeof address === "string") {
              reject(new Error("no port"));
              return;
            }

            fetch(`http://127.0.0.1:${address.port}/style.css`)
              .then(async (response) => {
                resolve({
                  type: response.headers.get("content-type") ?? undefined,
                  body: await response.text(),
                });
              })
              .catch(reject);
          });
        },
      );

      expect(content.body).toBe("body {}");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
