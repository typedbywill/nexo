/**
 * Route → output filename mapping for static export.
 *
 * Rules:
 * - `/` → `index.html`
 * - `/sobre` → `sobre.html`
 * - Nested routes are flattened with `-`: `/blog/post` → `blog-post.html`
 */
export function routeToFilename(route: string): string {
  if (route === "/") {
    return "index.html";
  }

  const slug = route.replace(/^\//, "").replace(/\//g, "-");
  return `${slug}.html`;
}

export function normalizeRoutePath(pathname: string): string {
  if (pathname === "" || pathname === "/index.html") {
    return "/";
  }

  const withoutExtension = pathname.replace(/\.html$/, "");
  if (withoutExtension === "" || withoutExtension === "/") {
    return "/";
  }

  return withoutExtension.startsWith("/")
    ? withoutExtension
    : `/${withoutExtension}`;
}
