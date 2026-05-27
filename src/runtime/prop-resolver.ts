import type { ComponentMeta } from "../types/component.js";
import type { PropDefinition, PropValue } from "../types/schema.js";
import type { ResolvedProps } from "../types/props.js";

type AttributeRecord = Record<string, string | null | undefined>;

function normalizeAttributes(
  attributes: NamedNodeMap | Record<string, string>,
): AttributeRecord {
  if (typeof (attributes as NamedNodeMap).item === "function") {
    const named = attributes as NamedNodeMap;
    const record: AttributeRecord = {};

    for (let index = 0; index < named.length; index += 1) {
      const attribute = named.item(index);
      if (attribute) {
        record[attribute.name] = attribute.value;
      }
    }

    return record;
  }

  return attributes as AttributeRecord;
}

function hasAttribute(
  attributes: AttributeRecord,
  name: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(attributes, name);
}

function getRawAttribute(
  attributes: AttributeRecord,
  name: string,
): string | null | undefined {
  return attributes[name];
}

function coerceString(value: string): string {
  return value;
}

function coerceNumber(
  value: string,
  fallback: PropValue | undefined,
): PropValue {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback ?? 0;
  }

  return parsed;
}

function coerceBoolean(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  return value === "true";
}

function coerceJson(
  value: string,
  fallback: PropValue | undefined,
  propName: string,
  componentName: string,
): PropValue {
  try {
    return JSON.parse(value) as PropValue;
  } catch {
    console.warn(
      `[Nexo] Invalid JSON for prop "${propName}" on <${componentName}>, using default`,
    );
    return fallback ?? [];
  }
}

function coerceValue(
  raw: string | null | undefined,
  definition: PropDefinition,
  propName: string,
  componentName: string,
  isPresent: boolean,
): PropValue | undefined {
  if (definition.type === "boolean") {
    if (!isPresent) {
      return undefined;
    }

    return coerceBoolean(raw);
  }

  if (raw === null || raw === undefined) {
    return undefined;
  }

  switch (definition.type) {
    case "string":
      return coerceString(raw);
    case "number":
      return coerceNumber(raw, definition.default);
    case "json":
      return coerceJson(raw, definition.default, propName, componentName);
    default:
      return raw;
  }
}

function resolveDefault(
  definition: PropDefinition,
  schemaProp?: PropDefinition,
): PropValue | undefined {
  if (schemaProp?.default !== undefined) {
    return schemaProp.default;
  }

  if (definition.default !== undefined) {
    return definition.default;
  }

  if (definition.type === "boolean") {
    return false;
  }

  if (definition.type === "number") {
    return 0;
  }

  if (definition.type === "json") {
    return [];
  }

  return "";
}

export function resolveProps(
  attributes: NamedNodeMap | Record<string, string>,
  meta: ComponentMeta,
  schemaProps?: Record<string, PropDefinition>,
): ResolvedProps {
  const normalized = normalizeAttributes(attributes);
  const resolved: ResolvedProps = {};

  for (const [name, definition] of Object.entries(meta.props)) {
    const present = hasAttribute(normalized, name);
    const raw = getRawAttribute(normalized, name);
    const schemaDefinition = schemaProps?.[name];

    if (present) {
      const coerced = coerceValue(
        raw,
        definition,
        name,
        meta.name,
        present,
      );
      resolved[name] =
        coerced ?? resolveDefault(definition, schemaDefinition) ?? "";
      continue;
    }

    const schemaDefault = schemaDefinition?.default;
    if (schemaDefault !== undefined) {
      resolved[name] = schemaDefault;
      continue;
    }

    if (definition.default !== undefined) {
      resolved[name] = definition.default;
      continue;
    }

    resolved[name] = resolveDefault(definition, schemaDefinition) ?? "";
  }

  for (const [name, definition] of Object.entries(meta.props)) {
    if (!definition.required) {
      continue;
    }

    const value = resolved[name];
    if (value === undefined || value === "" || value === null) {
      console.warn(
        `[Nexo] Missing required prop "${name}" on <${meta.name}>`,
      );
    }
  }

  return resolved;
}
