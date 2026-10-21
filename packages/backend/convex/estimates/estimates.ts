import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { checkMarkups } from "../accounts/organizations";
import { latestPublishedVersion } from "../catalog/norms";
import { requireFirmDoc, requireMember } from "../lib/access";
import { checkDate, romanianDate } from "../lib/dates";
import { appError, invalid, notFound } from "../lib/errors";
import { normalizeText } from "../lib/text";
import { store } from "../prices/validators";
import {
  pricedFields,
  readLineItems,
  readSections,
  requireEditableEstimate,
  resolverFor,
} from "./helpers";
import { applyMarkups, computeRecap, emptyRecap, lineTotals } from "./recap";
import { estimateKind, estimateStatus, markups } from "./validators";

function cleanTitle(title: string): string {
  const result = title.trim();
  if (!result || result.length > 300) {
    throw invalid("title");
  }
  return result;
}

// The number both as typed ("142") and as the code shows it ("DVZ-0142").
function searchText(number: number, title: string) {
  return normalizeText(`${number} ${String(number).padStart(4, "0")} ${title}`);
}

async function checkClient(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  clientId: Id<"clients"> | undefined,
) {
  if (!clientId) {
    return;
  }
  const client = await ctx.db.get("clients", clientId);
  if (!client || client.organizationId !== organizationId) {
    throw notFound("client");
  }
}

async function withClientNames(ctx: QueryCtx, estimates: Doc<"estimates">[]) {
  const names = new Map<Id<"clients">, string>();
  for (const estimate of estimates) {
    if (estimate.clientId && !names.has(estimate.clientId)) {
      const client = await ctx.db.get("clients", estimate.clientId);
      if (client) {
        names.set(estimate.clientId, client.name);
      }
    }
  }
  return estimates.map((estimate) => ({
    _id: estimate._id,
    number: estimate.number,
    revision: estimate.revision,
    title: estimate.title,
    kind: estimate.kind,
    status: estimate.status,
    clientId: estimate.clientId,
    clientName: estimate.clientId ? names.get(estimate.clientId) : undefined,
    priceDate: estimate.priceDate,
    total: estimate.totals.total,
    subtotal: estimate.totals.subtotal,
    updatedAt: estimate.updatedAt,
  }));
}

/** A firm's devize, most recently changed first. */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(estimateStatus),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const status = args.status;
    const result = status
      ? await ctx.db
          .query("estimates")
          .withIndex("by_organizationId_and_status_and_updatedAt", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("estimates")
          .withIndex("by_organizationId_and_updatedAt", (q) =>
            q.eq("organizationId", args.organizationId),
          )
          .order("desc")
          .paginate(args.paginationOpts);
    return { ...result, page: await withClientNames(ctx, result.page) };
  },
});

export const search = query({
  args: { organizationId: v.id("organizations"), text: v.string() },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const text = normalizeText(args.text);
    if (!text) {
      return [];
    }
    const estimates = await ctx.db
      .query("estimates")
      .withSearchIndex("search_searchText", (q) =>
        q.search("searchText", text).eq("organizationId", args.organizationId),
      )
      .take(20);
    return await withClientNames(ctx, estimates);
  },
});

/** A Deviz with its sections, line items and their totals. */
export const get = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const client = estimate.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;
    const items = await readLineItems(ctx, estimate._id);
    const norms = await normSources(
      ctx,
      items.flatMap((item) => (item.normId ? [item.normId] : [])),
    );
    return {
      ...estimate,
      client: client ? { _id: client._id, name: client.name } : null,
      sections: await readSections(ctx, estimate._id),
      lineItems: items.map((item) => ({
        ...item,
        norm: item.normId ? norms.get(item.normId) : undefined,
        totals: lineTotals(item),
      })),
    };
  },
});

/**
 * Where each line item's norm comes from, for the label under its title
 * ("normă ROCKWOOL · v2"). A deleted draft norm is left out.
 */
async function normSources(ctx: QueryCtx, normIds: Id<"norms">[]) {
  const sources = new Map<
    Id<"norms">,
    {
      source: Doc<"norms">["source"];
      version: number;
      manufacturerName?: string;
      confirmed: boolean;
    }
  >();
  const manufacturers = new Map<Id<"manufacturers">, string | undefined>();
  for (const normId of new Set(normIds)) {
    const norm = await ctx.db.get("norms", normId);
    if (!norm) {
      continue;
    }
    let manufacturerName: string | undefined;
    if (norm.manufacturerId) {
      if (!manufacturers.has(norm.manufacturerId)) {
        const manufacturer = await ctx.db.get(
          "manufacturers",
          norm.manufacturerId,
        );
        manufacturers.set(
          norm.manufacturerId,
          manufacturer
            ? (manufacturer.displayName ?? manufacturer.name)
            : undefined,
        );
      }
      manufacturerName = manufacturers.get(norm.manufacturerId);
    }
    sources.set(normId, {
      source: norm.source,
      version: norm.version,
      manufacturerName,
      confirmed: norm.confirmedAt !== undefined,
    });
  }
  return sources;
}

/** Every revision of a Deviz's number, the first one first. */
export const revisions = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const sameNumber = await ctx.db
      .query("estimates")
      .withIndex("by_organizationId_and_number", (q) =>
        q
          .eq("organizationId", estimate.organizationId)
          .eq("number", estimate.number),
      )
      .take(200);
    return sameNumber
      .map((revision) => ({
        _id: revision._id,
        revision: revision.revision,
        status: revision.status,
        total: revision.totals.total,
        updatedAt: revision.updatedAt,
      }))
      .sort((a, b) => a.revision - b.revision);
  },
});

/** Starts a Deviz with the firm's default markups and today's prices. */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    kind: v.optional(estimateKind),
    clientId: v.optional(v.id("clients")),
    description: v.optional(v.string()),
    siteAddress: v.optional(v.string()),
    county: v.optional(v.string()),
    priceDate: v.optional(v.string()),
  },
  returns: v.id("estimates"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.organizationId);
    const firm = await ctx.db.get("organizations", args.organizationId);
    if (!firm) {
      throw notFound("organization");
    }
    await checkClient(ctx, args.organizationId, args.clientId);
    const title = cleanTitle(args.title);
    const number = firm.lastEstimateNumber + 1;
    await ctx.db.patch("organizations", firm._id, {
      lastEstimateNumber: number,
    });
    const now = Date.now();
    return await ctx.db.insert("estimates", {
      organizationId: firm._id,
      number,
      title,
      searchText: searchText(number, title),
      description: optionalText(args.description, 5000),
      clientId: args.clientId,
      siteAddress: optionalText(args.siteAddress),
      county: optionalText(args.county ?? firm.county, 50),
      kind: args.kind ?? "private",
      status: "draft",
      priceDate: args.priceDate ? checkDate(args.priceDate) : romanianDate(now),
      markups: {
        ...firm.defaultMarkups,
        vat: firm.vatPayer ? firm.defaultMarkups.vat : 0,
      },
      totals: emptyRecap,
      revision: 1,
      createdBy: userId,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    estimateId: v.id("estimates"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    clientId: v.optional(v.union(v.id("clients"), v.null())),
    siteAddress: v.optional(v.string()),
    county: v.optional(v.string()),
    kind: v.optional(estimateKind),
    priceDate: v.optional(v.string()),
    markups: v.optional(markups),
    preferredStore: v.optional(v.union(store, v.null())),
    tender: v.optional(
      v.object({
        authority: v.optional(v.string()),
        procedure: v.optional(v.string()),
        deadline: v.optional(v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { estimate } = await requireEditableEstimate(ctx, args.estimateId);
    const patch: Partial<Doc<"estimates">> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      patch.title = cleanTitle(args.title);
      patch.searchText = searchText(estimate.number, patch.title);
    }
    if (args.description !== undefined) {
      patch.description = optionalText(args.description, 5000);
    }
    if (args.clientId !== undefined) {
      await checkClient(
        ctx,
        estimate.organizationId,
        args.clientId ?? undefined,
      );
      patch.clientId = args.clientId ?? undefined;
    }
    if (args.siteAddress !== undefined) {
      patch.siteAddress = optionalText(args.siteAddress);
    }
    if (args.county !== undefined) {
      patch.county = optionalText(args.county, 50);
    }
    if (args.kind !== undefined) {
      patch.kind = args.kind;
    }
    if (args.priceDate !== undefined) {
      patch.priceDate = checkDate(args.priceDate);
    }
    if (args.preferredStore !== undefined) {
      patch.preferredStore = args.preferredStore ?? undefined;
    }
    if (args.tender !== undefined) {
      patch.tender = {
        authority: optionalText(args.tender.authority),
        procedure: optionalText(args.tender.procedure, 100),
        deadline: args.tender.deadline
          ? checkDate(args.tender.deadline)
          : undefined,
      };
    }
    if (args.markups) {
      checkMarkups(args.markups);
      patch.markups = args.markups;
      // Markups only change what is added on top of the direct costs.
      patch.totals = applyMarkups(
        estimate.totals,
        estimate.totals.laborHours,
        args.markups,
      );
    }
    await ctx.db.patch("estimates", estimate._id, patch);
    return null;
  },
});

/**
 * Moves a Deviz through its life. Leaving draft locks it, so what the client
 * saw can't change; going back to draft unlocks it while no Ofertă is out.
 */
export const setStatus = mutation({
  args: { estimateId: v.id("estimates"), status: estimateStatus },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const now = Date.now();
    if (args.status === "draft") {
      const offers = await ctx.db
        .query("offers")
        .withIndex("by_estimateId", (q) => q.eq("estimateId", estimate._id))
        .take(100);
      if (
        offers.some(
          (offer) =>
            offer.status === "sent" ||
            offer.status === "viewed" ||
            offer.status === "accepted",
        )
      ) {
        throw appError("locked", "offer");
      }
      await ctx.db.patch("estimates", estimate._id, {
        status: "draft",
        lockedAt: undefined,
        updatedAt: now,
      });
      return null;
    }
    await ctx.db.patch("estimates", estimate._id, {
      status: args.status,
      lockedAt: estimate.lockedAt ?? now,
      updatedAt: now,
    });
    return null;
  },
});

/**
 * Copies a Deviz with its sections, line items and variants. A revision keeps
 * the number and counts up its revision; a copy gets a new number.
 */
export const duplicate = mutation({
  args: {
    estimateId: v.id("estimates"),
    asRevision: v.optional(v.boolean()),
    title: v.optional(v.string()),
  },
  returns: v.id("estimates"),
  handler: async (ctx, args) => {
    const { doc: source, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const firm = await ctx.db.get("organizations", source.organizationId);
    if (!firm) {
      throw notFound("organization");
    }
    let number = source.number;
    let revision = 1;
    let revisionOf: Id<"estimates"> | undefined;
    if (args.asRevision) {
      const sameNumber = await ctx.db
        .query("estimates")
        .withIndex("by_organizationId_and_number", (q) =>
          q.eq("organizationId", firm._id).eq("number", source.number),
        )
        .take(200);
      revision = Math.max(...sameNumber.map((e) => e.revision)) + 1;
      revisionOf = source.revisionOf ?? source._id;
    } else {
      number = firm.lastEstimateNumber + 1;
      await ctx.db.patch("organizations", firm._id, {
        lastEstimateNumber: number,
      });
    }
    const title = args.title ? cleanTitle(args.title) : source.title;
    const now = Date.now();
    const {
      _id,
      _creationTime,
      lockedAt,
      status,
      revisionOf: _revisionOf,
      ...copied
    } = source;
    const estimateId = await ctx.db.insert("estimates", {
      ...copied,
      number,
      title,
      searchText: searchText(number, title),
      status: "draft",
      revision,
      revisionOf,
      createdBy: userId,
      updatedAt: now,
    });
    const sectionIds = new Map<Id<"sections">, Id<"sections">>();
    for (const section of await readSections(ctx, source._id)) {
      const { _id: oldId, _creationTime: time, ...fields } = section;
      sectionIds.set(
        oldId,
        await ctx.db.insert("sections", { ...fields, estimateId }),
      );
    }
    for (const [oldId, newId] of sectionIds) {
      const section = await ctx.db.get("sections", oldId);
      if (section?.parentId) {
        await ctx.db.patch("sections", newId, {
          parentId: sectionIds.get(section.parentId),
        });
      }
    }
    const itemIds = new Map<Id<"lineItems">, Id<"lineItems">>();
    for (const item of await readLineItems(ctx, source._id)) {
      const { _id: oldId, _creationTime: time, ...fields } = item;
      itemIds.set(
        oldId,
        await ctx.db.insert("lineItems", {
          ...fields,
          estimateId,
          sectionId: fields.sectionId
            ? sectionIds.get(fields.sectionId)
            : undefined,
          updatedAt: now,
        }),
      );
    }
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_estimateId_and_position", (q) =>
        q.eq("estimateId", source._id),
      )
      .take(20);
    for (const variant of variants) {
      const { _id: oldId, _creationTime: time, ...fields } = variant;
      await ctx.db.insert("variants", {
        ...fields,
        estimateId,
        swaps: fields.swaps.flatMap((swap) => {
          const lineItemId = itemIds.get(swap.lineItemId);
          return lineItemId ? [{ ...swap, lineItemId }] : [];
        }),
      });
    }
    return estimateId;
  },
});

/**
 * Deletes a Deviz. Its rows go in the background, in batches, so even the
 * largest tender fits in the database's transaction limits.
 */
export const remove = mutation({
  args: { estimateId: v.id("estimates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
      "admin",
    );
    await ctx.db.delete("estimates", estimate._id);
    await ctx.scheduler.runAfter(0, internal.estimates.estimates.deleteRows, {
      estimateId: estimate._id,
    });
    return null;
  },
});

const BATCH = 200;

/** Deletes up to one batch of a deleted Deviz's rows, then schedules the rest. */
export const deleteRows = internalMutation({
  args: { estimateId: v.id("estimates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    let deleted = 0;
    for (const table of ["lineItems", "sections", "variants"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_estimateId_and_position", (q) =>
          q.eq("estimateId", args.estimateId),
        )
        .take(BATCH - deleted);
      for (const row of rows) {
        await ctx.db.delete(table, row._id);
      }
      deleted += rows.length;
    }
    for (const table of ["takeoffs", "offers"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_estimateId", (q) => q.eq("estimateId", args.estimateId))
        .take(Math.max(BATCH - deleted, 0));
      for (const row of rows) {
        await ctx.db.delete(table, row._id);
      }
      deleted += rows.length;
    }
    const files = await ctx.db
      .query("files")
      .withIndex("by_estimateId", (q) => q.eq("estimateId", args.estimateId))
      .take(Math.max(BATCH - deleted, 0));
    for (const file of files) {
      await ctx.db.patch("files", file._id, { estimateId: undefined });
    }
    deleted += files.length;
    if (deleted >= BATCH) {
      await ctx.scheduler.runAfter(0, internal.estimates.estimates.deleteRows, {
        estimateId: args.estimateId,
      });
    }
    return null;
  },
});

/**
 * What changed since the Deviz was priced: newer versions of its norms, and
 * resources whose price today differs, with the totals they would give.
 */
export const checkUpdates = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const items = await readLineItems(ctx, estimate._id);
    const resolver = resolverFor(ctx, estimate);
    const normUpdates: {
      lineItemId: Id<"lineItems">;
      normId: Id<"norms">;
      latestNormId: Id<"norms">;
      latestVersion: number;
    }[] = [];
    const priceChanges: {
      lineItemId: Id<"lineItems">;
      key: string;
      name: string;
      oldPrice: number;
      newPrice: number;
    }[] = [];
    const repriced: Doc<"lineItems">[] = [];
    const latestByNorm = new Map<Id<"norms">, Doc<"norms"> | null>();
    for (const item of items) {
      if (item.normId) {
        if (!latestByNorm.has(item.normId)) {
          const norm = await ctx.db.get("norms", item.normId);
          latestByNorm.set(
            item.normId,
            norm && norm.status !== "published"
              ? await latestPublishedVersion(ctx, norm)
              : null,
          );
        }
        const latest = latestByNorm.get(item.normId);
        if (latest && latest._id !== item.normId) {
          normUpdates.push({
            lineItemId: item._id,
            normId: item.normId,
            latestNormId: latest._id,
            latestVersion: latest.version,
          });
        }
      }
      let changed = false;
      const resources = [];
      for (const resource of item.resources) {
        if (resource.priceSource === "manual") {
          resources.push(resource);
          continue;
        }
        const price = await resolver.resolve(resource);
        if (Math.abs(price.unitPrice - resource.unitPrice) >= 0.005) {
          changed = true;
          priceChanges.push({
            lineItemId: item._id,
            key: resource.key,
            name: resource.name,
            oldPrice: resource.unitPrice,
            newPrice: price.unitPrice,
          });
          resources.push({ ...resource, unitPrice: price.unitPrice });
        } else {
          resources.push(resource);
        }
      }
      repriced.push(changed ? { ...item, ...pricedFields(resources) } : item);
    }
    return {
      normUpdates,
      priceChanges: priceChanges.slice(0, 500),
      priceChangeCount: priceChanges.length,
      currentTotals: estimate.totals,
      repricedTotals: computeRecap(repriced, estimate.markups),
    };
  },
});
