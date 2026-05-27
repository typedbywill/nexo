import type { ResolvedComponent } from "./component.js";
import type { ResolvedProps } from "./props.js";
import type { NexoSchema } from "./schema.js";

export interface MountContext {
  schema: NexoSchema;
  component: ResolvedComponent;
  props: ResolvedProps;
  element: HTMLElement;
}

export interface MountedInstance {
  shadowRoot: ShadowRoot;
  props: ResolvedProps;
  componentName: string;
  script: ResolvedComponent["script"];
}
