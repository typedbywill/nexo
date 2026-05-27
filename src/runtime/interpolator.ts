import type { ResolvedProps } from "../types/props.js";

const PLACEHOLDER_PATTERN =
  /\{\{\s*([a-zA-Z_$][\w$]*)\s*(?:\|\s*html\s*)?\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

export function interpolate(
  template: string,
  props: ResolvedProps,
): string {
  return template.replace(
    PLACEHOLDER_PATTERN,
    (match, propName: string) => {
      const isHtml = /\|\s*html\s*\}\}$/.test(match);
      const value = props[propName];
      const serialized = serializeValue(value);

      if (isHtml) {
        return serialized;
      }

      return escapeHtml(serialized);
    },
  );
}
