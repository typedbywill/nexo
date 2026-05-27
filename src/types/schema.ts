export type PropType = "string" | "number" | "boolean" | "json";

export type PropValue = string | number | boolean | unknown[];

export type AssetName = string;

export interface PropDefinition {
  type: PropType;
  default?: PropValue;
  required: boolean;
}

export interface NexoComponentSchema {
  source: string;
  assets?: {
    css?: AssetName[];
    js?: AssetName[];
  };
  props?: Record<string, PropDefinition>;
}

export interface NexoConfig {
  name: string;
  port?: number;
  assets: AssetName[];
}

export type NexoPages = Record<string, string[]>;

export interface NexoSchema {
  config: NexoConfig;
  pages: NexoPages;
  components: Record<string, NexoComponentSchema>;
}
