// Any origin works here: it only tells a path on this site from another site.
const BASE = "https://devize.invalid";

/**
 * The page to go back to after signing in, from the `next` parameter the
 * sign-in page is opened with: a path on this site, or undefined for
 * anything that could lead elsewhere ("//evil.example", "/\evil.example",
 * "https://…") or isn't a path.
 */
export function returnPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return undefined;
  }
  // Browsers drop tabs and newlines and read "\" as "/", so the URL parsed
  // here is where the browser would go.
  if (url.origin !== BASE) {
    return undefined;
  }
  return url.pathname + url.search + url.hash;
}

/** The sign-in page, sending people back to `path` once they're signed in. */
export function signInPath(path: string): string {
  return path === "/"
    ? "/login"
    : `/login?${new URLSearchParams({ next: path })}`;
}
