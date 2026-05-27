import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
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

async function runNexo(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("node", [cliPath, ...args], {
    cwd,
    env: process.env,
  });

  return stdout;
}

describe("CLI", () => {
  it("--help lists commands", async () => {
    const output = await runNexo(["--help"]);
    expect(output).toContain("init");
    expect(output).toContain("dev");
    expect(output).toContain("build");
  });

  it("init creates expected file tree", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "nexo-init-"));
    const projectDir = path.join(parent, "demo-app");

    try {
      await runNexo(["init", "demo-app"], parent);

      await expect(stat(path.join(projectDir, "schema.json"))).resolves.toBeDefined();
      await expect(stat(path.join(projectDir, "index.html"))).resolves.toBeDefined();
      await expect(
        stat(path.join(projectDir, "components/Hero/component.html")),
      ).resolves.toBeDefined();
      await expect(
        stat(path.join(projectDir, "components/Footer/meta.json")),
      ).resolves.toBeDefined();
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("build writes to custom output directory", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "nexo-build-cli-"));

    try {
      await runNexo(["init", "app"], parent);
      const projectDir = path.join(parent, "app");
      const outDir = path.join(parent, "custom-dist");

      await runNexo(["build", "--out", outDir], projectDir);

      const html = await readFile(path.join(outDir, "index.html"), "utf-8");
      expect(html).toContain("nexo-component");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
