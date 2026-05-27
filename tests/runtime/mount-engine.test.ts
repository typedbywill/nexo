/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  MountEngine,
  resetElementRegistration,
} from "../../src/runtime/mount-engine.js";
import type { MountContext } from "../../src/types/mount.js";

const component = {
  name: "Hero",
  html: "<h1>{{ title }}</h1>",
  css: ":host { display: block; }",
  script: {},
  meta: {
    name: "Hero",
    props: {
      title: { type: "string", default: "Hi", required: false },
    },
  },
};

describe("MountEngine", () => {
  beforeEach(() => {
    resetElementRegistration();
    document.body.innerHTML = "";
  });

  it("mounts shadow root with style and interpolated html", async () => {
    const engine = new MountEngine(() => {});
    const element = document.createElement("div");

    await engine.mount({
      schema: {
        config: { name: "t", assets: [] },
        pages: { "/": ["Hero"] },
        components: { Hero: { source: "./Hero" } },
      },
      component,
      props: { title: "Pizza" },
      element,
    } as MountContext);

    expect(element.shadowRoot).toBeTruthy();
    expect(element.shadowRoot?.querySelector("style")?.textContent).toContain(
      ":host",
    );
    expect(element.shadowRoot?.querySelector("h1")?.textContent).toBe("Pizza");
  });

  it("replaces content when mounting twice", async () => {
    const engine = new MountEngine(() => {});
    const element = document.createElement("div");
    const ctx = {
      schema: {
        config: { name: "t", assets: [] },
        pages: { "/": ["Hero"] },
        components: { Hero: { source: "./Hero" } },
      },
      component,
      props: { title: "One" },
      element,
    } as MountContext;

    await engine.mount(ctx);
    await engine.mount({ ...ctx, props: { title: "Two" } });

    expect(element.shadowRoot?.querySelector("h1")?.textContent).toBe("Two");
  });

  it("unmount clears shadow root", async () => {
    const engine = new MountEngine(() => {});
    const element = document.createElement("div");

    await engine.mount({
      schema: {
        config: { name: "t", assets: [] },
        pages: { "/": ["Hero"] },
        components: { Hero: { source: "./Hero" } },
      },
      component,
      props: { title: "X" },
      element,
    } as MountContext);

    engine.unmount(element);
    expect(element.shadowRoot?.childNodes.length ?? 0).toBe(0);
  });
});
