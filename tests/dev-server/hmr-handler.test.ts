import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveHmrMessage } from "../../src/dev-server/hmr-handler.js";

const root = "/project";

describe("resolveHmrMessage", () => {
  it("returns full-reload for schema.json", () => {
    expect(resolveHmrMessage(path.join(root, "schema.json"), root)).toEqual({
      type: "full-reload",
    });
  });

  it("returns full-reload for meta.json changes", () => {
    expect(
      resolveHmrMessage(
        path.join(root, "components/Hero/meta.json"),
        root,
      ),
    ).toEqual({ type: "full-reload" });
  });

  it("returns component-reload for template changes", () => {
    expect(
      resolveHmrMessage(
        path.join(root, "components/Hero/component.html"),
        root,
      ),
    ).toEqual({ type: "component-reload", component: "Hero" });
  });

  it("returns component-reload for style.css and script.js", () => {
    expect(
      resolveHmrMessage(path.join(root, "components/Hero/style.css"), root),
    ).toEqual({ type: "component-reload", component: "Hero" });

    expect(
      resolveHmrMessage(path.join(root, "components/Hero/script.js"), root),
    ).toEqual({ type: "component-reload", component: "Hero" });
  });
});
