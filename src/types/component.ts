import type { PropDefinition, PropValue } from "./schema.js";

export interface ComponentMeta {
  name: string;
  props: Record<string, PropDefinition>;
}

export interface ComponentScript {
  mounted?: (ctx: ComponentContext) => void | Promise<void>;
  destroy?: (ctx: ComponentContext) => void | Promise<void>;
}

export interface ComponentContext {
  element: ShadowRoot;
  props: Record<string, PropValue>;
  emit: (event: string, data?: unknown) => void;
}

export interface ResolvedComponent {
  name: string;
  html: string;
  css: string;
  script: ComponentScript;
  meta: ComponentMeta;
}
