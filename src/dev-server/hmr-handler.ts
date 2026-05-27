import path from "node:path";

export type HmrMessage =
  | { type: "full-reload" }
  | { type: "component-reload"; component: string };

export function resolveHmrMessage(
  filePath: string,
  rootDir: string,
): HmrMessage {
  const relative = path.relative(rootDir, filePath).replace(/\\/g, "/");

  if (relative === "schema.json") {
    return { type: "full-reload" };
  }

  const match = relative.match(/^components\/([^/]+)\/(.+)$/);
  if (!match) {
    return { type: "full-reload" };
  }

  const [, componentName, fileName] = match;

  if (fileName === "meta.json") {
    return { type: "full-reload" };
  }

  if (
    fileName === "component.html" ||
    fileName === "style.css" ||
    fileName === "script.js"
  ) {
    return { type: "component-reload", component: componentName };
  }

  return { type: "full-reload" };
}
