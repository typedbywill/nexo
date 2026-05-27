import { describe, expect, it } from "vitest";

import { interpolate } from "../../src/runtime/interpolator.js";

describe("interpolate", () => {
  it("substitutes {{ title }}", () => {
    expect(interpolate("<h1>{{ title }}</h1>", { title: "Pizza" })).toBe(
      "<h1>Pizza</h1>",
    );
  });

  it("does not escape with {{ title | html }}", () => {
    expect(
      interpolate("<div>{{ content | html }}</div>", {
        content: "<strong>ok</strong>",
      }),
    ).toBe("<div><strong>ok</strong></div>");
  });

  it("replaces missing props with empty string", () => {
    expect(interpolate("<p>{{ missing }}</p>", {})).toBe("<p></p>");
  });

  it("escapes special characters in default mode", () => {
    expect(interpolate("{{ x }}", { x: "<script>" })).toBe(
      "&lt;script&gt;",
    );
  });

  it("renders numbers and booleans as strings", () => {
    expect(interpolate("{{ n }}{{ b }}", { n: 42, b: true })).toBe("42true");
  });

  it("handles adjacent placeholders", () => {
    expect(interpolate("{{ a }}{{ b }}", { a: "1", b: "2" })).toBe("12");
  });

  it("does not recursively interpolate inserted values", () => {
    expect(interpolate("{{ a }}", { a: "{{ b }}" })).toBe("{{ b }}");
  });
});
