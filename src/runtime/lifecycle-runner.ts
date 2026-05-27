import type {
  ComponentContext,
  ComponentScript,
} from "../types/component.js";

type LifecycleHook = "mounted" | "destroy";

interface ObservedElement {
  host: HTMLElement;
  onRemove: () => void;
}

let sharedObserver: MutationObserver | null = null;
const observedElements = new Set<ObservedElement>();

function ensureObserver(): MutationObserver {
  if (sharedObserver) {
    return sharedObserver;
  }

  sharedObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }

        for (const observed of [...observedElements]) {
          if (node === observed.host || node.contains(observed.host)) {
            observed.onRemove();
            unobserveInternal(observed.host);
          }
        }
      });
    }
  });

  sharedObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return sharedObserver;
}

function unobserveInternal(host: HTMLElement): void {
  for (const observed of observedElements) {
    if (observed.host === host) {
      observedElements.delete(observed);
      break;
    }
  }

  if (observedElements.size === 0 && sharedObserver) {
    sharedObserver.disconnect();
    sharedObserver = null;
  }
}

export class LifecycleRunner {
  createEmit(host: HTMLElement): ComponentContext["emit"] {
    return (event: string, data?: unknown) => {
      host.dispatchEvent(
        new CustomEvent(event, {
          detail: data,
          bubbles: true,
          composed: true,
        }),
      );
    };
  }

  async run(
    hook: LifecycleHook,
    ctx: ComponentContext,
    script: ComponentScript,
  ): Promise<void> {
    const handler = script[hook];

    if (!handler) {
      return;
    }

    try {
      await handler(ctx);
    } catch (error) {
      console.error(
        `[Nexo] Error in ${hook} hook for component:`,
        error,
      );
    }
  }

  observe(element: HTMLElement, onRemove: () => void): void {
    ensureObserver();
    observedElements.add({ host: element, onRemove });
  }

  unobserve(element: HTMLElement): void {
    unobserveInternal(element);
  }
}
