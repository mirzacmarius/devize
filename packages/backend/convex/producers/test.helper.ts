import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { signIn, type TestConvex, tilingResources } from "../test.helper";

// A made-up Producător for the producer portal's tests. Never use a real
// producer's norms or documents: they are copyrighted and the repository is
// public.

/** A producer as Devize's research adds one, with its norms received. */
export async function insertManufacturer(
  t: TestConvex,
  name: string,
  createdBy: Id<"users">,
): Promise<Id<"manufacturers">> {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("manufacturers", {
        name,
        nameKey: name.toLowerCase(),
        wave: 1,
        status: "norms_received",
        normsStatus: "received",
        claimStatus: "unclaimed",
        brands: [],
        categories: [],
        mainProducts: [],
        retailers: [],
        existingNorms: [],
        technicalDocs: [],
        declaredConsumption: [],
        createdBy,
      }),
  );
}

/** A producer whose profile shows, with one published norm. */
export async function visibleProducer(t: TestConvex) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const manufacturerId = await insertManufacturer(
    t,
    "Termo Test SA",
    admin.userId,
  );
  const normId = await publishedNorm(admin, manufacturerId, {
    code: "TT-01A01",
    title: "Termosistem Test, montare sub 8 m",
  });
  return { admin, manufacturerId, normId };
}

export async function publishedNorm(
  admin: Awaited<ReturnType<typeof signIn>>,
  manufacturerId: Id<"manufacturers">,
  fields: { code: string; title: string },
) {
  const normId = await admin.as.mutation(api.catalog.norms.create, {
    source: "manufacturer",
    manufacturerId,
    ...fields,
    unit: "mp",
    resources: tilingResources,
  });
  await admin.as.mutation(api.catalog.norms.publish, { normId });
  return normId;
}

/** The same producer, claimed by Ana with the link Devize sent her. */
export async function claimedProducer(t: TestConvex) {
  const producer = await visibleProducer(t);
  const { token } = await producer.admin.as.mutation(
    api.producers.admin.createLink,
    { manufacturerId: producer.manufacturerId, email: "ana@termotest.ro" },
  );
  const ana = await signIn(t, {
    name: "Ana",
    email: "ana@termotest.ro",
    verified: true,
  });
  const { organizationId } = await ana.as.mutation(
    api.producers.claimLinks.claim,
    { token },
  );
  return { ...producer, ana, organizationId };
}
