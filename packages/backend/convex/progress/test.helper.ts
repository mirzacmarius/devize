import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { firmOwner, publishedBaseNorm, type TestConvex } from "../test.helper";

// An accepted Deviz with two Articole, for the progress tests: 24 mp of
// tiling from a base norm and 6 mp of a custom false ceiling.

export async function acceptedDeviz(t: TestConvex, firmName = "Ana") {
  const { normId } = await publishedBaseNorm(t);
  const firm = await firmOwner(t, firmName);
  const clientId = await firm.as.mutation(api.accounts.clients.create, {
    organizationId: firm.organizationId,
    kind: "person",
    name: "Ion Popescu",
  });
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Baie apartament",
    clientId,
    siteAddress: "Str. Lungă 10, Brașov",
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
  await firm.as.mutation(api.estimates.estimates.setStatus, {
    estimateId,
    status: "sent",
  });
  await firm.as.mutation(api.estimates.estimates.setStatus, {
    estimateId,
    status: "accepted",
  });
  return { firm, estimateId, tilingId, ceilingId, clientId };
}

/** A statement for the period, with its rows. */
export async function statementFor(
  firm: Awaited<ReturnType<typeof firmOwner>>,
  estimateId: Id<"estimates">,
  period: { periodStart: string; periodEnd: string; date?: string },
) {
  const statementId = await firm.as.mutation(api.progress.statements.create, {
    estimateId,
    ...period,
  });
  const statement = await firm.as.query(api.progress.statements.get, {
    statementId,
  });
  return { statementId, statement };
}
