import { dirname } from "node:path";

import type { NexoSchema } from "../types/schema.js";
import type { ResolvedProps } from "../types/props.js";
import { AssetInjector } from "./asset-injector.js";
import { resolveComponent } from "./component-resolver.js";
import { MountEngine } from "./mount-engine.js";
import { parseSchema } from "./schema-parser.js";
import { resolveProps } from "./prop-resolver.js";

export class NexoRuntime {
  private schema: NexoSchema | null = null;
  private rootDir = "";
  private readonly assetInjector = new AssetInjector();
  private readonly mountEngine: MountEngine;

  constructor() {
    this.mountEngine = new MountEngine((element) => {
      void this.handleConnect(element);
    });
  }

  async init(schemaPath: string): Promise<void> {
    this.schema = await parseSchema(schemaPath);
    this.rootDir = dirname(schemaPath);
    this.assetInjector.injectGlobal(this.schema.config.assets);
  }

  getSchema(): NexoSchema | null {
    return this.schema;
  }

  getRootDir(): string {
    return this.rootDir;
  }

  getAssetInjector(): AssetInjector {
    return this.assetInjector;
  }

  getMountEngine(): MountEngine {
    return this.mountEngine;
  }

  private async handleConnect(element: HTMLElement): Promise<void> {
    const name = element.getAttribute("name");
    if (!name || !this.schema) {
      return;
    }

    await this.mount(name, element);
  }

  async mount(
    name: string,
    element: HTMLElement,
    extraProps?: ResolvedProps,
  ): Promise<void> {
    if (!this.schema) {
      throw new Error("[Nexo] Runtime not initialized. Call init() first.");
    }

    const component = await resolveComponent(
      name,
      this.schema,
      this.rootDir,
    );
    const componentSchema = this.schema.components[name];
    const props = resolveProps(
      element.attributes,
      component.meta,
      componentSchema?.props,
    );

    if (extraProps) {
      Object.assign(props, extraProps);
    }

    this.assetInjector.injectComponent(componentSchema?.assets);

    await this.mountEngine.mount({
      schema: this.schema,
      component,
      props,
      element,
    });
  }

  unmount(element: HTMLElement): void {
    this.mountEngine.unmount(element);
  }

  async remount(name: string): Promise<void> {
    const elements = [
      ...document.querySelectorAll<HTMLElement>(
        `nexo-component[name="${name}"]`,
      ),
    ];

    for (const element of elements) {
      this.unmount(element);
      await this.mount(name, element);
    }
  }
}

export function createRuntime(): NexoRuntime {
  return new NexoRuntime();
}
