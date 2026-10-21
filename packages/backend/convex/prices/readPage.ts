import type { Infer } from "convex/values";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { env, internalAction } from "../_generated/server";
import { type ProductPage, readProductPage } from "./pageParser";
import { robotsAllows } from "./robots";
import { storeOfHost } from "./stores";
import type { readStatus } from "./validators";

// The one place Devize fetches a store's page. It says who it is, asks for
// the page once, and takes no for an answer: robots.txt, a refusal or a
// captcha end the read, and the firm types the price instead.

/** The name robots.txt rules address Devize's reader by. */
export const ROBOTS_AGENT = "DevizeBot";

function userAgent(): string {
  const site = env.SITE_URL?.trim();
  return `Mozilla/5.0 (compatible; ${ROBOTS_AGENT}/1.0${site ? `; +${site}` : ""})`;
}

const TIMEOUT_MS = 15_000;
const MAX_PAGE_LENGTH = 3_000_000;

type Outcome = {
  status: Infer<typeof readStatus>;
  page?: ProductPage;
  pausedUntil?: number;
};

// Answers that mean the store doesn't want to be read now.
const refusals = [401, 403, 429, 503];

/** Ends a request that takes too long, where the runtime can. */
function deadline(): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(TIMEOUT_MS)
    : undefined;
}

/** When a refusal asks to come back, from its Retry-After header. */
function retryAt(response: Response): number | undefined {
  const value = response.headers.get("retry-after");
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Date.now() + seconds * 1000;
  }
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : date;
}

/**
 * The robots.txt of the page's site, "" when it has none, or how the read
 * ends when the site doesn't answer it.
 */
async function fetchRobots(
  url: string,
): Promise<{ robotsTxt: string } | { outcome: Outcome }> {
  let response: Response;
  try {
    response = await fetch(new URL("/robots.txt", url), {
      headers: { "user-agent": userAgent() },
      signal: deadline(),
    });
  } catch {
    return { outcome: { status: "failed" } };
  }
  if (refusals.includes(response.status)) {
    return {
      outcome: { status: "blocked", pausedUntil: retryAt(response) },
    };
  }
  if (response.ok) {
    try {
      return { robotsTxt: (await response.text()).slice(0, 200_000) };
    } catch {
      return { outcome: { status: "failed" } };
    }
  }
  // RFC 9309: a missing robots.txt (4xx) allows everything; a server
  // error means the site can't say, so nothing is read.
  return response.status >= 400 && response.status < 500
    ? { robotsTxt: "" }
    : { outcome: { status: "failed" } };
}

async function fetchProduct(url: string): Promise<Outcome> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "user-agent": userAgent(),
        accept: "text/html,application/xhtml+xml",
        "accept-language": "ro-RO,ro;q=0.9",
      },
      signal: deadline(),
    });
  } catch {
    return { status: "failed" };
  }
  if (response.status === 404 || response.status === 410) {
    return { status: "not_found" };
  }
  if (refusals.includes(response.status)) {
    return { status: "blocked", pausedUntil: retryAt(response) };
  }
  // A redirect may only stay on the store's own site.
  const finalUrl = response.url || url;
  if (!response.ok || !storeOfHost(new URL(finalUrl).hostname)) {
    return { status: "failed" };
  }
  if (!/html/i.test(response.headers.get("content-type") ?? "text/html")) {
    return { status: "no_price" };
  }
  let html: string;
  try {
    html = (await response.text()).slice(0, MAX_PAGE_LENGTH);
  } catch {
    return { status: "failed" };
  }
  const page = readProductPage(html);
  return page ? { status: "done", page } : { status: "no_price" };
}

/** Reads one product page for a pending read and saves what it found. */
export const run = internalAction({
  args: { readId: v.id("storeReads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const read = await ctx.runQuery(internal.prices.reading.load, args);
    if (!read) {
      return null;
    }
    const robots =
      read.robotsTxt === undefined
        ? await fetchRobots(read.url)
        : { robotsTxt: read.robotsTxt };
    const outcome: Outcome =
      "outcome" in robots
        ? robots.outcome
        : robotsAllows(
              robots.robotsTxt,
              ROBOTS_AGENT,
              new URL(read.url).pathname,
            )
          ? await fetchProduct(read.url)
          : { status: "disallowed" };
    const found = outcome.page;
    await ctx.runMutation(internal.prices.reading.finish, {
      readId: args.readId,
      status: outcome.status,
      page: found && {
        title: found.title,
        price: found.price,
        ean: found.ean,
        sku: found.sku,
        inStock: found.inStock,
      },
      // Saved when it was just read from the store.
      robotsTxt:
        read.robotsTxt === undefined && "robotsTxt" in robots
          ? robots.robotsTxt
          : undefined,
      pausedUntil: outcome.pausedUntil,
    });
    return null;
  },
});
