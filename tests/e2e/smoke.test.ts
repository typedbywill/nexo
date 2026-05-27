import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const cliPath = path.join(repoRoot, "dist/cli/index.js");

describe("e2e smoke", () => {
  it("init → edit component → build produces expected HTML", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "nexo-e2e-"));

    try {
      await execFileAsync("node", [cliPath, "init", "demo"], { cwd: parent });

      const projectDir = path.join(parent, "demo");
      const heroHtml = path.join(projectDir, "components/Hero/component.html");

      let content = await readFile(heroHtml, "utf-8");
      content = content.replace(
        "<h1>{{ title }}</h1>",
        "<h1>Pizza Nexo Especial</h1>",
      );
      await writeFile(heroHtml, content, "utf-8");

      await execFileAsync("node", [cliPath, "build"], { cwd: projectDir });

      const output = await readFile(
        path.join(projectDir, "dist/index.html"),
        "utf-8",
      );

      expect(output).toContain("Pizza Nexo Especial");
      expect(output).toContain('template shadowrootmode="open"');
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
