/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssetInjector } from "../../src/runtime/asset-injector.js";

describe("AssetInjector", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("injects global CSS and JS tags", () => {
    const injector = new AssetInjector();
    injector.injectGlobal(["tailwind", "gsap"]);

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    const scripts = document.head.querySelectorAll("script");

    expect(links.length).toBe(1);
    expect(scripts.length).toBe(1);
    expect(links[0]?.getAttribute("href")).toContain("tailwind");
    expect(scripts[0]?.getAttribute("src")).toContain("gsap");
  });

  it("deduplicates assets by URL", () => {
    const injector = new AssetInjector();
    injector.injectGlobal(["tailwind"]);
    injector.injectGlobal(["tailwind"]);

    expect(document.head.querySelectorAll("link").length).toBe(1);
  });

  it("warns on unknown assets without throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const injector = new AssetInjector();

    expect(() => injector.injectGlobal(["unknown-lib"])).not.toThrow();
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it("injects CSS before JS in the same call", () => {
    const injector = new AssetInjector();
    injector.injectComponent({ css: ["tailwind"], js: ["gsap"] });

    const children = [...document.head.children];
    const linkIndex = children.findIndex((node) => node.tagName === "LINK");
    const scriptIndex = children.findIndex((node) => node.tagName === "SCRIPT");

    expect(linkIndex).toBeGreaterThanOrEqual(0);
    expect(scriptIndex).toBeGreaterThan(linkIndex);
  });

  it("reset() clears dedup set", () => {
    const injector = new AssetInjector();
    injector.injectGlobal(["tailwind"]);
    injector.reset();
    injector.injectGlobal(["tailwind"]);

    expect(document.head.querySelectorAll("link").length).toBe(2);
  });
});
