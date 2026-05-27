import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/index.ts"],
  outDir: "dist",
  format: ["esm"],
  sourcemap: true,
  clean: true,
  dts: false,
  target: "es2022",
  splitting: false,
  shims: false,
});
