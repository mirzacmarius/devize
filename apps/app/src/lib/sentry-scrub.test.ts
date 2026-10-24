import { describe, expect, test } from "bun:test";
import type { Event } from "@sentry/nextjs";
import {
  scrubBreadcrumb,
  scrubEvent,
  scrubSpan,
  withoutSecrets,
} from "./sentry-scrub";

const TOKEN = "q3Xk9vTn2LpW8sYd4RbH7cJf";

describe("withoutSecrets", () => {
  test("drops queries and the tokens of Oferte, claim links and invitations", () => {
    expect(withoutSecrets(`https://devize.ro/o/${TOKEN}?v=2#semnatura`)).toBe(
      "https://devize.ro/o/[token]",
    );
    expect(withoutSecrets(`/en/claim/${TOKEN}`)).toBe("/en/claim/[token]");
    expect(withoutSecrets(`Failed to load /invite/${TOKEN}/accept`)).toBe(
      "Failed to load /invite/[token]/accept",
    );
    expect(withoutSecrets("/login?next=/o/abc&code=12345678")).toBe("/login");
  });

  test("keeps the other paths, and route patterns, as they are", () => {
    for (const path of [
      "/estimates/k57a3x0b9q/takeoff",
      "/[locale]/o/[token]",
      "/photo/1",
      "/catalog",
    ]) {
      expect(withoutSecrets(path)).toBe(path);
    }
  });
});

describe("Sentry reports", () => {
  test("carry no link token, from the browser or the server", () => {
    const event = scrubEvent({
      request: {
        url: `https://devize.ro/o/${TOKEN}`,
        headers: { referer: `https://devize.ro/claim/${TOKEN}` },
      },
      transaction: `/o/${TOKEN}`,
      message: `Offer /o/${TOKEN} failed`,
      exception: { values: [{ value: `Cannot read /invite/${TOKEN}` }] },
      contexts: { nextjs: { request_path: `/ro/o/${TOKEN}` } },
      tags: { url: `/o/${TOKEN}` },
      extra: { links: [`/claim/${TOKEN}`] },
    } satisfies Event);
    expect(JSON.stringify(event)).not.toContain(TOKEN);
    expect(event.contexts?.nextjs?.request_path).toBe("/ro/o/[token]");
  });

  test("leave no link token in traces or breadcrumbs", () => {
    const span = scrubSpan({
      trace_id: "t",
      span_id: "s",
      name: `GET /o/${TOKEN}`,
      start_timestamp: 0,
      status: "ok",
      is_segment: true,
      attributes: {
        "url.full": `https://devize.ro/o/${TOKEN}`,
        "http.status": 200,
      },
    });
    expect(JSON.stringify(span)).not.toContain(TOKEN);
    expect(span.attributes["http.status"]).toBe(200);

    const breadcrumb = scrubBreadcrumb({
      category: "navigation",
      data: { from: `/invite/${TOKEN}`, to: "/estimates" },
    });
    expect(breadcrumb.data).toEqual({
      from: "/invite/[token]",
      to: "/estimates",
    });
  });
});
