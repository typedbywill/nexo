import type { AssetDefinition, AssetRegistry } from "../types/asset.js";
import type { AssetName } from "../types/schema.js";

export const ASSET_REGISTRY: AssetRegistry = {
  tailwind: {
    type: "css",
    url: "https://cdn.tailwindcss.com",
  },
  gsap: {
    type: "js",
    url: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js",
  },
  lucide: {
    type: "js",
    url: "https://unpkg.com/lucide@latest/dist/umd/lucide.min.js",
  },
};

export class AssetInjector {
  private readonly registry: AssetRegistry;
  private readonly injected = new Set<string>();
  private readonly head: HTMLElement;

  constructor(
    registry: AssetRegistry = ASSET_REGISTRY,
    head: HTMLElement = document.head,
  ) {
    this.registry = registry;
    this.head = head;
  }

  reset(): void {
    this.injected.clear();
  }

  injectGlobal(names: AssetName[]): void {
    this.injectNames(names);
  }

  injectComponent(assets?: {
    css?: AssetName[];
    js?: AssetName[];
  }): void {
    if (!assets) {
      return;
    }

    this.injectNames(assets.css ?? []);
    this.injectNames(assets.js ?? []);
  }

  private injectNames(names: AssetName[]): void {
    const cssAssets: AssetDefinition[] = [];
    const jsAssets: AssetDefinition[] = [];

    for (const name of names) {
      const definition = this.registry[name];

      if (!definition) {
        console.warn(`[Nexo] Unknown asset "${name}", skipping`);
        continue;
      }

      if (this.injected.has(definition.url)) {
        continue;
      }

      if (definition.type === "css") {
        cssAssets.push(definition);
      } else {
        jsAssets.push(definition);
      }
    }

    for (const asset of cssAssets) {
      this.appendAsset(asset);
    }

    for (const asset of jsAssets) {
      this.appendAsset(asset);
    }
  }

  private appendAsset(definition: AssetDefinition): void {
    if (this.injected.has(definition.url)) {
      return;
    }

    if (definition.type === "css") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = definition.url;
      this.head.appendChild(link);
    } else {
      const script = document.createElement("script");
      script.src = definition.url;
      script.defer = true;
      this.head.appendChild(script);
    }

    this.injected.add(definition.url);
  }
}
