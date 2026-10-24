import { Glob } from "bun";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

// Tests run Convex functions in memory with convex-test. Bun has no
// `import.meta.glob`, so the module map is built here. Convex skips files
// with more than one dot in their name, so this one is never deployed.
const modules: Record<string, () => Promise<unknown>> = {};
for (const file of new Glob("**/*.{ts,js}").scanSync(import.meta.dir)) {
  const name = file.split("/").at(-1) ?? file;
  if (file.endsWith(".d.ts") || name.split(".").length > 2) {
    continue;
  }
  modules[`./${file}`] = () => import(`${import.meta.dir}/${file}`);
}

// What one function may read and write, as convex-test names the limits;
// `true` enforces Convex's own.
type TransactionLimits =
  | boolean
  | Partial<
      Record<
        "bytesRead" | "bytesWritten" | "documentsRead" | "documentsWritten",
        number
      >
    >;

/** A fresh in-memory deployment, by default with no transaction limits. */
export function setup(options: { transactionLimits?: TransactionLimits } = {}) {
  return convexTest({ schema, modules, ...options });
}

export type TestConvex = ReturnType<typeof setup>;

/**
 * A signed-in user, as Convex Auth identifies one, optionally a super admin.
 * `verified` marks the address as proven, as Google and an emailed code do.
 */
export async function signIn(
  t: TestConvex,
  fields: {
    name: string;
    superadmin?: boolean;
    email?: string;
    verified?: boolean;
  },
) {
  const userId: Id<"users"> = await t.run(
    async (ctx) =>
      await ctx.db.insert("users", {
        name: fields.name,
        email: fields.email ?? `${fields.name.toLowerCase()}@example.com`,
        ...(fields.verified ? { emailVerificationTime: Date.now() } : {}),
        ...(fields.superadmin ? { role: "superadmin" as const } : {}),
      }),
  );
  return {
    userId,
    as: t.withIdentity({ subject: `${userId}|session`, name: fields.name }),
  };
}

// A made-up wall tiling norm, per mp. Never use real producer norms in tests:
// they are copyrighted and the repository is public.
export const tilingResources = [
  {
    kind: "material" as const,
    name: "Adeziv flexibil C2TE",
    unit: "kg",
    quantity: 4.5,
    referencePrice: 2.4,
  },
  {
    kind: "material" as const,
    name: "Faianță",
    unit: "mp",
    quantity: 1.05,
    referencePrice: 45,
  },
  {
    kind: "material" as const,
    name: "Chit de rosturi",
    unit: "kg",
    quantity: 0.5,
    referencePrice: 6,
  },
  {
    kind: "material" as const,
    name: "Material mărunt",
    unit: "%",
    quantity: 2,
  },
  {
    kind: "labor" as const,
    name: "Faianțar",
    unit: "ore",
    quantity: 0.9,
    referencePrice: 30,
  },
  {
    kind: "labor" as const,
    name: "Muncitor deservire",
    unit: "ore",
    quantity: 0.2,
    referencePrice: 20,
  },
  {
    kind: "equipment" as const,
    name: "Mașină de tăiat faianță",
    unit: "ora",
    quantity: 0.05,
    referencePrice: 10,
  },
  {
    kind: "transport" as const,
    name: "Transport materiale",
    unit: "%",
    quantity: 2,
  },
];

/** A published base norm, written by a super admin. */
export async function publishedBaseNorm(
  t: TestConvex,
  fields: { code?: string; title?: string } = {},
) {
  const admin = await signIn(t, { name: "Admin", superadmin: true });
  const normId = await admin.as.mutation(api.catalog.norms.create, {
    source: "base",
    code: fields.code ?? "DV-FAI-01",
    title: fields.title ?? "Placare cu faianță pe pereți",
    unit: "m2",
    category: "Finisaje",
    resources: tilingResources,
  });
  await admin.as.mutation(api.catalog.norms.publish, { normId });
  return { normId, admin };
}

/**
 * Publishes the base catalog's edition as `admin`, or a new super admin, and
 * waits for every batch. Each batch schedules the next, and convex-test can
 * come back from draining the scheduler between two of them, so it drains
 * until no scheduled function is left pending.
 */
export async function publishBaseCatalog(
  t: TestConvex,
  admin?: Awaited<ReturnType<typeof signIn>>,
) {
  const by = admin ?? (await signIn(t, { name: "Admin", superadmin: true }));
  await by.as.mutation(api.catalog.baseCatalog.publish, {});
  for (let round = 0; round < 50; round++) {
    await t.finishAllScheduledFunctions(() => {});
    const pending = await t.run(async (ctx) => {
      const jobs = await ctx.db.system.query("_scheduled_functions").collect();
      return jobs.filter(
        (job) =>
          job.state.kind === "pending" || job.state.kind === "inProgress",
      ).length;
    });
    if (pending === 0) {
      return by;
    }
  }
  throw new Error("publishing the base catalog did not finish");
}

/** A firm owned by a new user. */
export async function firmOwner(t: TestConvex, name: string) {
  const owner = await signIn(t, { name });
  const organizationId = await owner.as.mutation(
    api.accounts.organizations.create,
    { name: `${name} Construct SRL` },
  );
  return { ...owner, organizationId };
}
