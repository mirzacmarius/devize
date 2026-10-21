import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { firmOwner, publishedBaseNorm, type TestConvex } from "../test.helper";

// Made-up Devize and a fake Resend for the Ofertă tests.

export type SentEmail = { to: string[]; subject: string; text: string };

const realFetch = globalThis.fetch;
const variables = ["SITE_URL", "AUTH_RESEND_KEY"];

/** Sends email through a fake Resend; returns what it sends. */
export function fakeResend(): SentEmail[] {
  const sent: SentEmail[] = [];
  process.env.SITE_URL = "https://devize.test";
  process.env.AUTH_RESEND_KEY = "re_test";
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)) as SentEmail);
    return new Response('{"id":"1"}', { status: 200 });
  }) as typeof fetch;
  return sent;
}

export function restoreEmail() {
  globalThis.fetch = realFetch;
  for (const name of variables) {
    delete process.env[name];
  }
}

/**
 * A Deviz with a tiling norm and a custom false ceiling, for Ion. A second
 * firm in the same test needs its own name and norm code.
 */
export async function devizFor(
  t: TestConvex,
  firmName = "Ana",
  code = "DV-FAI-01",
) {
  const { normId } = await publishedBaseNorm(t, { code });
  const firm = await firmOwner(t, firmName);
  const clientId = await firm.as.mutation(api.accounts.clients.create, {
    organizationId: firm.organizationId,
    kind: "person",
    name: "Ion Popescu",
    phone: "0722 123 456",
    notes: "Plătește greu, cere avans.",
  });
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Baie apartament",
    clientId,
  });
  const tilingId = await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
    estimateId,
    normId,
    quantity: 24,
  });
  const ceilingId = await firm.as.mutation(api.estimates.lineItems.addCustom, {
    estimateId,
    title: "Tavan fals din gips-carton",
    unit: "mp",
    quantity: 6,
    resources: [
      {
        kind: "material",
        name: "Placă gips-carton",
        unit: "mp",
        quantity: 1.05,
        unitPrice: 30,
      },
      {
        kind: "labor",
        name: "Montator",
        unit: "ora",
        quantity: 0.8,
        unitPrice: 40,
      },
    ],
  });
  await firm.as.mutation(api.estimates.lineItems.update, {
    lineItemId: tilingId,
    notes: "Cantitate din releveu, verifică la fața locului.",
  });
  return { firm, estimateId, tilingId, ceilingId, normId };
}

/** A Variantă that swaps the tiles for pricier ones. */
export async function premiumVariant(
  t: TestConvex,
  firm: Awaited<ReturnType<typeof firmOwner>>,
  estimateId: Id<"estimates">,
  tilingId: Id<"lineItems">,
) {
  return await t.run(async (ctx) => {
    const item = await ctx.db.get("lineItems", tilingId);
    const tiles = item?.resources.find((r) => r.name === "Faianță");
    if (!tiles) {
      throw new Error("no tiles");
    }
    return await ctx.db.insert("variants", {
      organizationId: firm.organizationId,
      estimateId,
      name: "Premium",
      tier: "premium",
      position: 1,
      swaps: [
        {
          lineItemId: tilingId,
          resourceKey: tiles.key,
          name: "Faianță rectificată 60×120",
          unitPrice: 120,
          priceSource: "manual",
        },
      ],
    });
  });
}
