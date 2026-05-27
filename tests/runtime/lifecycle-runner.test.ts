/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";

import { LifecycleRunner } from "../../src/runtime/lifecycle-runner.js";

describe("LifecycleRunner", () => {
  it("awaits mounted hook", async () => {
    const runner = new LifecycleRunner();
    const order: string[] = [];

    await runner.run(
      "mounted",
      {
        element: document.createElement("div").attachShadow({ mode: "open" }),
        props: {},
        emit: () => {},
      },
      {
        mounted: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          order.push("mounted");
        },
      },
    );

    order.push("after");
    expect(order).toEqual(["mounted", "after"]);
  });

  it("logs mounted errors without propagating", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const runner = new LifecycleRunner();

    await expect(
      runner.run(
        "mounted",
        {
          element: document.createElement("div").attachShadow({ mode: "open" }),
          props: {},
          emit: () => {},
        },
        {
          mounted: () => {
            throw new Error("boom");
          },
        },
      ),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("emit dispatches CustomEvent on host", () => {
    const runner = new LifecycleRunner();
    const host = document.createElement("div");
    const emit = runner.createEmit(host);
    let detail: unknown;

    host.addEventListener("test-event", ((event: CustomEvent) => {
      detail = event.detail;
    }) as EventListener);

    emit("test-event", { ok: true });
    expect(detail).toEqual({ ok: true });
  });

  it("calls onRemove when host is removed from DOM", async () => {
    const runner = new LifecycleRunner();
    const host = document.createElement("div");
    document.body.appendChild(host);

    const onRemove = vi.fn();
    runner.observe(host, onRemove);

    host.remove();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onRemove).toHaveBeenCalled();
  });
});
