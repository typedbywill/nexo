import { describe, expect, it, vi } from "vitest";

import { resolveProps } from "../../src/runtime/prop-resolver.js";
import type { ComponentMeta } from "../../src/types/component.js";

const meta: ComponentMeta = {
  name: "Hero",
  props: {
    title: { type: "string", default: "Default", required: false },
    count: { type: "number", default: 1, required: false },
    dark: { type: "boolean", default: false, required: false },
    items: { type: "json", default: [], required: false },
    requiredTitle: { type: "string", default: "", required: true },
  },
};

describe("resolveProps", () => {
  it("coerces string, number, boolean, and json per docs", () => {
    const props = resolveProps(
      {
        title: "Hello",
        count: "42",
        dark: "true",
        items: '["a","b"]',
      },
      meta,
    );

    expect(props.title).toBe("Hello");
    expect(props.count).toBe(42);
    expect(props.dark).toBe(true);
    expect(props.items).toEqual(["a", "b"]);
  });

  it("treats boolean attribute presence without value as true", () => {
    const props = resolveProps({ dark: "" }, meta);
    expect(props.dark).toBe(true);
  });

  it("falls back to default on invalid JSON and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const props = resolveProps({ items: "not-json" }, meta);

    expect(props.items).toEqual([]);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it("warns on missing required prop without throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => resolveProps({}, meta)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing required prop "requiredTitle"'),
    );

    warn.mockRestore();
  });

  it("uses schema props over meta defaults", () => {
    const props = resolveProps(
      {},
      meta,
      {
        title: { type: "string", default: "From schema", required: false },
      },
    );

    expect(props.title).toBe("From schema");
  });

  it("prefers HTML attributes over defaults", () => {
    const props = resolveProps({ title: "From attr" }, meta);
    expect(props.title).toBe("From attr");
  });

  it("falls back to default when number is NaN", () => {
    const props = resolveProps({ count: "abc" }, meta);
    expect(props.count).toBe(1);
  });
});
