import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { connection } from "next/server";

/**
 * The signed-in user's token, for a server component that reads Convex. Such a
 * read answers for the moment it runs, and Convex's client gives each one a
 * random id, so it waits for the page's request rather than run in a link's
 * prefetch (ADR 0029). Put the component under a Suspense boundary.
 */
export async function convexToken() {
  await connection();
  return convexAuthNextjsToken();
}
