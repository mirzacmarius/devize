import type { Breadcrumb, BrowserOptions, Event } from "@sentry/nextjs";

type Span = Parameters<NonNullable<BrowserOptions["beforeSendSpan"]>>[0];

const QUERY = /((?:https?:\/\/|\/)[^\s?#"']*)[?#][^\s"']*/g;
// The secret part of an Ofertă's, a claim link's and an invitation's path
// (app/[locale]/o, claim and invite): whoever has it opens the page.
const PATH_TOKEN = /(\/(?:o|claim|invite)\/)[^\s/?#"']+/g;

/**
 * Removes the query string and hash from every address in a text, and the
 * token from the paths of Oferte, claim links and invitations. They can carry
 * sign-in codes and other secrets.
 */
export function withoutSecrets(text: string) {
  return text.replace(QUERY, "$1").replace(PATH_TOKEN, "$1[token]");
}

/** `value` with `withoutSecrets` applied to the texts in it, a few levels deep. */
function scrubbed<T>(value: T, depth = 3): T {
  if (typeof value === "string") {
    return withoutSecrets(value) as T;
  }
  if (depth === 0 || typeof value !== "object" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubbed(item, depth - 1)) as T;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      scrubbed(item, depth - 1),
    ]),
  ) as T;
}

/** An error report with no cookies, headers, queries or link tokens. */
export function scrubEvent<E extends Event>(event: E): E {
  if (event.request) {
    if (event.request.url) {
      event.request.url = withoutSecrets(event.request.url);
    }
    event.request.query_string = undefined;
    event.request.cookies = undefined;
    event.request.headers = undefined;
  }
  if (event.transaction) {
    event.transaction = withoutSecrets(event.transaction);
  }
  if (event.message) {
    event.message = withoutSecrets(event.message);
  }
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) {
      exception.value = withoutSecrets(exception.value);
    }
  }
  // Such as the path of the request that failed on the server.
  event.contexts = scrubbed(event.contexts);
  event.tags = scrubbed(event.tags);
  event.extra = scrubbed(event.extra);
  return event;
}

/** A trace's span, named and described without queries or link tokens. */
export function scrubSpan(span: Span): Span {
  span.name = withoutSecrets(span.name);
  for (const [key, value] of Object.entries(span.attributes)) {
    if (typeof value === "string") {
      span.attributes[key] = withoutSecrets(value);
    }
  }
  return span;
}

/** A breadcrumb whose message and addresses lack queries and link tokens. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.message) {
    breadcrumb.message = withoutSecrets(breadcrumb.message);
  }
  for (const key of ["url", "from", "to"]) {
    const value = breadcrumb.data?.[key];
    if (typeof value === "string" && breadcrumb.data) {
      breadcrumb.data[key] = withoutSecrets(value);
    }
  }
  return breadcrumb;
}
