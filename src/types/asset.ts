import type { AssetName } from "./schema.js";

export type AssetType = "css" | "js";

export interface AssetDefinition {
  type: AssetType;
  url: string;
}

export type AssetRegistry = Record<AssetName, AssetDefinition>;
