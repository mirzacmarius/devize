import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { createI18nMiddleware } from "next-international/middleware";
import { legalPaths } from "./lib/legal";
import { returnPath, signInPath } from "./lib/return-path";
import { defaultLocale, locales } from "./locales/locale";

/**
 * Pages are served in the language picked in the language menu, which the
 * library keeps in its own cookie, and in Romanian otherwise. The URL never
 * shows the language: the proxy rewrites each page to its [locale] path.
 */
const I18nMiddleware = createI18nMiddleware({
  locales: [...locales],
  defaultLocale,
  urlMappingStrategy: "rewrite",
  resolveLocaleFromRequest: () => defaultLocale,
});

/** A page path plus its language-prefixed forms, e.g. /login and /en/login. */
const inEveryLanguage = (paths: string[]) =>
  paths.flatMap((path) => [
    path,
    ...locales.map((locale) => `/${locale}${path}`),
  ]);

const isSignInPage = createRouteMatcher(inEveryLanguage(["/login"]));
// The sign-in page's request for a code (app/api/sign-in-code), which is no
// page and comes from people not signed in.
const isCodeRequest = createRouteMatcher(["/api/sign-in-code"]);
// An Ofertă's link, which the firm's client opens without an account, and the
// legal documents, which emails to producers, the website and the sign-in page
// link to.
const isPublicPage = createRouteMatcher(
  inEveryLanguage(["/o/:token", ...Object.values(legalPaths)]),
);

export const proxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isCodeRequest(request)) {
      return;
    }
    const isAuthenticated = await convexAuth.isAuthenticated();
    const isSignIn = isSignInPage(request);
    // Signing in leads back to the page that asked for it, such as an
    // invitation's link.
    if (isSignIn && isAuthenticated) {
      const next = returnPath(request.nextUrl.searchParams.get("next"));
      return nextjsMiddlewareRedirect(request, next ?? "/");
    }
    if (!isSignIn && !isAuthenticated && !isPublicPage(request)) {
      const { pathname, search } = request.nextUrl;
      return nextjsMiddlewareRedirect(request, signInPath(pathname + search));
    }
    return I18nMiddleware(request);
  },
  { convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL },
);

export const config = {
  // Everything except Next internals, files with an extension (such as the
  // manifest), the generated app icons and Vercel BotID's own path
  // (botid/next/config), plus /api, where Convex Auth handles sign-in
  // requests.
  matcher: [
    "/((?!_next/static|_next/image|api|icon|apple-icon|149e9513-01fa-4fb0-aad4-566afd725d1b|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
