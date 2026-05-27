import type { MountContext, MountedInstance } from "../types/mount.js";
import type { ComponentContext } from "../types/component.js";
import { interpolate } from "./interpolator.js";
import { LifecycleRunner } from "./lifecycle-runner.js";

let elementRegistered = false;

export class MountEngine {
  private readonly instances = new WeakMap<HTMLElement, MountedInstance>();
  private readonly lifecycle = new LifecycleRunner();
  private readonly onConnect: (element: HTMLElement) => void;

  constructor(onConnect: (element: HTMLElement) => void) {
    this.onConnect = onConnect;
    this.registerElement();
  }

  private registerElement(): void {
    if (elementRegistered || typeof customElements === "undefined") {
      return;
    }

    const onConnect = this.onConnect;

    class NexoComponentElement extends HTMLElement {
      connectedCallback(): void {
        onConnect(this);
      }
    }

    if (!customElements.get("nexo-component")) {
      customElements.define("nexo-component", NexoComponentElement);
      elementRegistered = true;
    }
  }

  async mount(context: MountContext): Promise<void> {
    const { element, component, props } = context;
    const interpolated = interpolate(component.html, props);

    let shadowRoot = element.shadowRoot;
    if (!shadowRoot) {
      shadowRoot = element.attachShadow({ mode: "open" });
    } else {
      shadowRoot.replaceChildren();
    }

    const style = document.createElement("style");
    style.textContent = component.css;
    shadowRoot.appendChild(style);

    const container = document.createElement("div");
    container.innerHTML = interpolated;
    while (container.firstChild) {
      shadowRoot.appendChild(container.firstChild);
    }

    const ctx: ComponentContext = {
      element: shadowRoot,
      props,
      emit: this.lifecycle.createEmit(element),
    };

    this.instances.set(element, {
      shadowRoot,
      props,
      componentName: component.name,
      script: component.script,
    });

    this.lifecycle.observe(element, () => {
      void this.runDestroy(element, ctx);
    });

    await this.lifecycle.run("mounted", ctx, component.script);
  }

  private async runDestroy(
    element: HTMLElement,
    ctx: ComponentContext,
  ): Promise<void> {
    const instance = this.instances.get(element);
    if (!instance) {
      return;
    }

    await this.lifecycle.run("destroy", ctx, instance.script);
    this.instances.delete(element);
    this.lifecycle.unobserve(element);
  }

  unmount(element: HTMLElement): void {
    const instance = this.instances.get(element);
    if (!instance) {
      return;
    }

    const ctx: ComponentContext = {
      element: instance.shadowRoot,
      props: instance.props,
      emit: this.lifecycle.createEmit(element),
    };

    void this.runDestroy(element, ctx);

    if (element.shadowRoot) {
      element.shadowRoot.replaceChildren();
    }
  }

  getInstance(element: HTMLElement): MountedInstance | undefined {
    return this.instances.get(element);
  }
}

export function resetElementRegistration(): void {
  elementRegistered = false;
}
