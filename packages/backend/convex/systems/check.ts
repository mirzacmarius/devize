import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { isUsableBy } from "../catalog/access";
import { latestPublishedVersion } from "../catalog/norms";
import { readLineItems, readSections } from "../estimates/helpers";
import { requireFirmDoc } from "../lib/access";
import { normalizeUnit } from "../lib/text";
import { isVisible } from "../producers/access";
import {
  type ProducerSystem,
  perimeterOf,
  type RestSuggestion,
  restOfSystems,
  type SystemItem,
  suitableSystems,
  unsuitableFindings,
} from "./completion";
import { contextsOf, type ItemContexts } from "./contexts";
import { type RuleFinding, ruleFindings } from "./rules";

// The compatibility check of a Deviz (Sisteme compatibile): combinations of
// materials that don't suit where an Articol is done, the Producători's own
// word on their systems, and what the systems the Deviz started still lack
// (docs/adr/0028).

// Producers' systems offered instead of a wrong combination.
const MAX_ALTERNATIVES = 3;

type NormRef = {
  normId: Id<"norms">;
  code: string;
  title: string;
  unit: string;
  category?: string;
  manufacturer?: string;
};

type Loaded = {
  estimate: Doc<"estimates">;
  items: Doc<"lineItems">[];
  systemItems: (SystemItem & { category?: string })[];
  contexts: Map<string, ItemContexts>;
  // The published systems of the producers whose norms or products the
  // Deviz holds.
  systems: ProducerSystem[];
};

function producerName(manufacturer: Doc<"manufacturers">): string {
  return manufacturer.displayName ?? manufacturer.name;
}

function asProducerSystem(
  system: Doc<"systems">,
  producer: string,
): ProducerSystem {
  return {
    _id: system._id,
    name: system.name,
    producer,
    normLineageIds: system.normLineageIds,
    productIds: system.productIds,
    suitable: system.suitable,
    unsuitable: system.unsuitable,
  };
}

/** The published systems of the producers a firm may see. */
async function publishedSystems(
  ctx: QueryCtx,
  manufacturerId: Id<"manufacturers">,
): Promise<ProducerSystem[]> {
  const manufacturer = await ctx.db.get("manufacturers", manufacturerId);
  if (!manufacturer || !(await isVisible(ctx, manufacturer))) {
    return [];
  }
  const rows = await ctx.db
    .query("systems")
    .withIndex("by_manufacturerId", (q) =>
      q.eq("manufacturerId", manufacturerId),
    )
    .take(100);
  return rows
    .filter((row) => row.status === "published")
    .map((row) => asProducerSystem(row, producerName(manufacturer)));
}

async function load(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
): Promise<Loaded> {
  const items = await readLineItems(ctx, estimate._id);
  const sections = await readSections(ctx, estimate._id);
  const norms = new Map<Id<"norms">, Doc<"norms">>();
  for (const normId of new Set(items.flatMap((i) => i.normId ?? []))) {
    const norm = await ctx.db.get("norms", normId);
    if (norm) {
      norms.set(normId, norm);
    }
  }
  const systemItems = items.map((item) => {
    const norm = item.normId ? norms.get(item.normId) : undefined;
    return {
      _id: item._id,
      sectionId: item.sectionId,
      title: item.title,
      notes: item.notes,
      code: item.code,
      resources: item.resources,
      baseCode: norm?.source === "base" ? norm.code : undefined,
      lineageId: norm ? (norm.lineageId ?? norm._id) : undefined,
      productIds: item.resources.flatMap((r) => r.productId ?? []),
      category: norm?.category,
    };
  });
  const contexts = contextsOf({
    estimateTitle: estimate.title,
    sections: sections.map((s) => ({
      _id: s._id,
      name: s.name,
      parentId: s.parentId,
    })),
    items: systemItems,
  });
  const manufacturers = new Set<Id<"manufacturers">>();
  for (const norm of norms.values()) {
    if (norm.manufacturerId) {
      manufacturers.add(norm.manufacturerId);
    }
  }
  const productIds = new Set(
    items.flatMap((item) => item.resources.flatMap((r) => r.productId ?? [])),
  );
  for (const productId of productIds) {
    const product = await ctx.db.get("products", productId);
    if (product) {
      manufacturers.add(product.manufacturerId);
    }
  }
  const systems: ProducerSystem[] = [];
  for (const manufacturerId of manufacturers) {
    systems.push(...(await publishedSystems(ctx, manufacturerId)));
  }
  return { estimate, items, systemItems, contexts, systems };
}

/** A Normă de bază by its code, as published now. */
async function baseNorm(
  ctx: QueryCtx,
  code: string,
  cache: Map<string, NormRef | null>,
): Promise<NormRef | null> {
  if (cache.has(code)) {
    return cache.get(code) ?? null;
  }
  const rows = await ctx.db
    .query("norms")
    .withIndex("by_code", (q) => q.eq("code", code))
    .take(50);
  const norm = rows.find(
    (row) =>
      row.source === "base" &&
      row.status === "published" &&
      row.visibility === "public",
  );
  const ref = norm ? asNormRef(norm) : null;
  cache.set(code, ref);
  return ref;
}

/** A norm's newest published version, by its lineage, if the firm may use it. */
async function lineageNorm(
  ctx: QueryCtx,
  lineageId: Id<"norms">,
  organizationId: Id<"organizations">,
): Promise<Doc<"norms"> | null> {
  const first = await ctx.db.get("norms", lineageId);
  const latest = first ? await latestPublishedVersion(ctx, first) : null;
  return latest && isUsableBy(latest, organizationId) ? latest : null;
}

function asNormRef(norm: Doc<"norms">, manufacturer?: string): NormRef {
  return {
    normId: norm._id,
    code: norm.code,
    title: norm.title,
    unit: norm.unit,
    category: norm.category,
    manufacturer,
  };
}

/**
 * How much of a suggested norm the Articole that started its system call
 * for: their quantity in the same unit, or, for a skirting in m after floors
 * in mp, the length around the floors their Antemăsurători measured.
 */
async function suggestedQuantity(
  ctx: QueryCtx,
  starting: readonly Doc<"lineItems">[],
  unit: string,
): Promise<{ quantity: number; from: "same" | "perimeter" } | null> {
  const target = normalizeUnit(unit);
  const same = starting.filter((item) => normalizeUnit(item.unit) === target);
  if (same.length > 0) {
    const quantity = same.reduce((sum, item) => sum + item.quantity, 0);
    return { quantity: Math.round(quantity * 100) / 100, from: "same" };
  }
  if (
    target !== "m" ||
    !starting.every((item) => normalizeUnit(item.unit) === "mp")
  ) {
    return null;
  }
  let perimeter = 0;
  for (const item of starting) {
    const takeoffs = await ctx.db
      .query("takeoffs")
      .withIndex("by_lineItemId", (q) => q.eq("lineItemId", item._id))
      .take(10);
    if (takeoffs.length === 0) {
      return null;
    }
    for (const takeoff of takeoffs) {
      const length = perimeterOf(takeoff.rows);
      if (length === null) {
        return null;
      }
      perimeter += length;
    }
  }
  return { quantity: Math.round(perimeter * 100) / 100, from: "perimeter" };
}

async function dismissedKeys(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
): Promise<Set<string>> {
  const rows = await ctx.db
    .query("compatibilityDismissals")
    .withIndex("by_organizationId_and_number_and_key", (q) =>
      q
        .eq("organizationId", estimate.organizationId)
        .eq("number", estimate.number),
    )
    .take(1000);
  return new Set(rows.map((row) => row.key));
}

type Finding = RuleFinding & {
  system?: ReturnType<typeof unsuitableFindings>[number]["system"];
};

/** What the check finds, with its norms looked up. */
async function checkOf(ctx: QueryCtx, loaded: Loaded) {
  const { estimate, items, systemItems, contexts, systems } = loaded;
  const organizationId = estimate.organizationId;
  const codes = new Map<string, NormRef | null>();
  const byId = new Map(items.map((item) => [item._id as string, item]));
  const categories = new Map(
    systemItems.map((item) => [item._id, item.category]),
  );

  const findings: Finding[] = [
    ...ruleFindings(systemItems, contexts),
    ...unsuitableFindings(systemItems, contexts, systems),
  ];

  // The producers' systems meant for each context, with their norms, for
  // the alternatives to a wrong combination.
  const everySystem = new Map<string, ProducerSystem & { norms: NormRef[] }>();
  const published = await ctx.db
    .query("systems")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .take(300);
  const producers = new Map<Id<"manufacturers">, string | null>();
  for (const row of published) {
    if (!producers.has(row.manufacturerId)) {
      const manufacturer = await ctx.db.get(
        "manufacturers",
        row.manufacturerId,
      );
      producers.set(
        row.manufacturerId,
        manufacturer && (await isVisible(ctx, manufacturer))
          ? producerName(manufacturer)
          : null,
      );
    }
    const producer = producers.get(row.manufacturerId);
    if (!producer) {
      continue;
    }
    const norms: NormRef[] = [];
    for (const lineageId of row.normLineageIds) {
      const norm = await lineageNorm(ctx, lineageId, organizationId);
      if (norm) {
        norms.push(asNormRef(norm, producer));
      }
    }
    everySystem.set(row._id, { ...asProducerSystem(row, producer), norms });
  }

  const resolved = [];
  for (const finding of findings) {
    const item = byId.get(finding.lineItemId);
    if (!item) {
      continue;
    }
    const fix =
      finding.fix?.kind === "norm"
        ? await baseNorm(ctx, finding.fix.code, codes)
        : null;
    const category = categories.get(finding.lineItemId);
    const alternatives =
      finding.context && category
        ? suitableSystems([...everySystem.values()], finding.context)
            .filter((system) => system._id !== finding.system?.id)
            .flatMap((system) => {
              const norm = system.norms.find(
                (n) =>
                  n.category === category &&
                  normalizeUnit(n.unit) === normalizeUnit(item.unit),
              );
              return norm
                ? [
                    {
                      systemId: system._id as Id<"systems">,
                      system: system.name,
                      producer: system.producer,
                      norm,
                    },
                  ]
                : [];
            })
            .slice(0, MAX_ALTERNATIVES)
        : [];
    resolved.push({
      ...finding,
      lineItemId: item._id,
      itemTitle: item.title,
      fix:
        finding.fix?.kind === "material"
          ? finding.fix
          : fix && normalizeUnit(fix.unit) === normalizeUnit(item.unit)
            ? { kind: "norm" as const, norm: fix }
            : undefined,
      alternatives,
    });
  }

  const rest = [];
  for (const suggestion of restOfSystems(systemItems, contexts, systems)) {
    const norm = await restNorm(ctx, suggestion, organizationId, codes);
    if (!norm) {
      continue;
    }
    const starting = suggestion.lineItemIds.flatMap((id) => byId.get(id) ?? []);
    const last = starting.at(-1);
    if (!last) {
      continue;
    }
    rest.push({
      key: suggestion.key,
      system: suggestion.system,
      norm,
      lineItemIds: starting.map((item) => item._id),
      itemTitles: starting.map((item) => item.title),
      quantity: await suggestedQuantity(ctx, starting, norm.unit),
      // The new Articol goes after the last of them, in its Capitol.
      afterId: last._id,
      sectionId: last.sectionId,
    });
  }
  return { findings: resolved, rest };
}

async function restNorm(
  ctx: QueryCtx,
  suggestion: RestSuggestion,
  organizationId: Id<"organizations">,
  codes: Map<string, NormRef | null>,
): Promise<NormRef | null> {
  if (suggestion.baseCode) {
    return await baseNorm(ctx, suggestion.baseCode, codes);
  }
  if (suggestion.lineageId && suggestion.system.kind === "producer") {
    const norm = await lineageNorm(
      ctx,
      suggestion.lineageId as Id<"norms">,
      organizationId,
    );
    return norm ? asNormRef(norm, suggestion.system.producer) : null;
  }
  return null;
}

/**
 * A Deviz's compatibility check: what doesn't suit where it is done, with
 * the swap or the norm that fixes it and the producers' systems meant for
 * it, and the works its systems still lack. What the firm dismissed comes
 * marked, so it can be shown again.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const loaded = await load(ctx, estimate);
    const { findings, rest } = await checkOf(ctx, loaded);
    const dismissed = await dismissedKeys(ctx, estimate);
    return {
      estimate: {
        _id: estimate._id,
        locked: estimate.lockedAt !== undefined,
      },
      findings: findings
        .map((finding) => ({
          ...finding,
          dismissed: dismissed.has(finding.key),
        }))
        .sort(
          (a, b) =>
            Number(a.dismissed) - Number(b.dismissed) ||
            Number(b.severity === "error") - Number(a.severity === "error"),
        ),
      rest: rest.map((suggestion) => ({
        ...suggestion,
        dismissed: dismissed.has(suggestion.key),
      })),
    };
  },
});

/**
 * What the check finds in a Deviz and the firm didn't dismiss, one short
 * Romanian sentence each, for the AI that looks for omissions: it treats
 * them as already flagged.
 */
export async function compatibilityFindings(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
): Promise<{ lineItemIds: Id<"lineItems">[]; sentence: string }[]> {
  const { findings, rest } = await checkOf(ctx, await load(ctx, estimate));
  const dismissed = await dismissedKeys(ctx, estimate);
  return [
    ...findings
      .filter((finding) => !dismissed.has(finding.key))
      .map((finding) => ({
        lineItemIds: [finding.lineItemId],
        sentence: `„${finding.itemTitle}”, „${finding.material}”: ${finding.summary}.`,
      })),
    ...rest
      .filter((suggestion) => !dismissed.has(suggestion.key))
      .map((suggestion) => ({
        lineItemIds: suggestion.lineItemIds,
        sentence: `Sistemul „${suggestion.system.name}” cere și „${suggestion.norm.title}”.`,
      })),
  ];
}
