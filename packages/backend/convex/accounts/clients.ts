import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { roundLei } from "../estimates/recap";
import { requireFirmDoc, requireMember } from "../lib/access";
import { appError, invalid } from "../lib/errors";
import { normalizeText } from "../lib/text";
import { cleanCui, optionalText } from "./identifiers";
import { clientKind } from "./validators";

// How much of a firm's work the clients' list adds up: the latest devize, and
// the invoices still open.
const MAX_COUNTED_ESTIMATES = 1000;
const MAX_COUNTED_INVOICES = 1000;

function cleanName(name: string) {
  const result = name.trim();
  if (!result || result.length > 200) {
    throw invalid("name");
  }
  return result;
}

/** A firm's clients by name, or those matching the words typed. */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const text = normalizeText(args.text ?? "");
    if (text) {
      return await ctx.db
        .query("clients")
        .withSearchIndex("search_nameKey", (q) =>
          q.search("nameKey", text).eq("organizationId", args.organizationId),
        )
        .take(20);
    }
    return await ctx.db
      .query("clients")
      .withIndex("by_organizationId_and_nameKey", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(500);
  },
});

/**
 * What the firm has going on with its clients: each one's devize, archived ones
 * aside, and what they still owe on the invoices issued for them. A client with
 * neither isn't listed.
 */
type Activity = {
  estimates: number;
  owed: number;
  latest?: Pick<
    Doc<"estimates">,
    "number" | "revision" | "title" | "status"
  > & { estimateId: Id<"estimates"> };
};

export const activity = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const rows = new Map<Id<"clients">, Activity>();
    const row = (clientId: Id<"clients">) => {
      const found = rows.get(clientId);
      if (found) {
        return found;
      }
      const added: Activity = { estimates: 0, owed: 0 };
      rows.set(clientId, added);
      return added;
    };
    const clientOf = new Map<Id<"estimates">, Id<"clients">>();
    const estimates = await ctx.db
      .query("estimates")
      .withIndex("by_organizationId_and_updatedAt", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(MAX_COUNTED_ESTIMATES);
    for (const estimate of estimates) {
      if (estimate.clientId) {
        clientOf.set(estimate._id, estimate.clientId);
        if (estimate.status !== "archived") {
          const client = row(estimate.clientId);
          client.estimates += 1;
          // They come newest first, so the first one seen is the latest.
          client.latest ??= {
            estimateId: estimate._id,
            number: estimate.number,
            revision: estimate.revision,
            title: estimate.title,
            status: estimate.status,
          };
        }
      }
    }
    const open = await ctx.db
      .query("invoices")
      .withIndex("by_organizationId_and_status_and_updatedAt", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "issued"),
      )
      .take(MAX_COUNTED_INVOICES);
    for (const invoice of open) {
      if (invoice.kind === "storno" || invoice.stornoedBy !== undefined) {
        continue;
      }
      const clientId =
        clientOf.get(invoice.estimateId) ??
        (await ctx.db.get("estimates", invoice.estimateId))?.clientId;
      if (clientId) {
        row(clientId).owed += invoice.totals.total - invoice.paidAmount;
      }
    }
    return [...rows].map(([clientId, { estimates: count, owed, latest }]) => ({
      clientId,
      estimates: count,
      owed: roundLei(owed),
      latest,
    }));
  },
});

export const get = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const { doc } = await requireFirmDoc(ctx, "clients", args.clientId);
    return doc;
  },
});

const contactFields = {
  cui: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  notes: v.optional(v.string()),
};

function cleanContact(fields: {
  cui?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  const patch: Partial<Doc<"clients">> = {};
  if (fields.cui !== undefined) {
    const cui = optionalText(fields.cui);
    patch.cui = cui ? cleanCui(cui) : undefined;
  }
  if (fields.email !== undefined) {
    patch.email = optionalText(fields.email, 200);
  }
  if (fields.phone !== undefined) {
    patch.phone = optionalText(fields.phone, 50);
  }
  if (fields.address !== undefined) {
    patch.address = optionalText(fields.address);
  }
  if (fields.notes !== undefined) {
    patch.notes = optionalText(fields.notes, 5000);
  }
  return patch;
}

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    kind: clientKind,
    name: v.string(),
    ...contactFields,
  },
  returns: v.id("clients"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const name = cleanName(args.name);
    return await ctx.db.insert("clients", {
      organizationId: args.organizationId,
      kind: args.kind,
      name,
      nameKey: normalizeText(name),
      ...cleanContact(args),
    });
  },
});

export const update = mutation({
  args: {
    clientId: v.id("clients"),
    kind: v.optional(clientKind),
    name: v.optional(v.string()),
    ...contactFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc } = await requireFirmDoc(ctx, "clients", args.clientId);
    const patch = cleanContact(args);
    if (args.kind !== undefined) {
      patch.kind = args.kind;
    }
    if (args.name !== undefined) {
      patch.name = cleanName(args.name);
      patch.nameKey = normalizeText(patch.name);
    }
    await ctx.db.patch("clients", doc._id, patch);
    return null;
  },
});

/** Deletes a client no Deviz refers to. */
export const remove = mutation({
  args: { clientId: v.id("clients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc } = await requireFirmDoc(ctx, "clients", args.clientId);
    const estimate = await ctx.db
      .query("estimates")
      .withIndex("by_clientId", (q) => q.eq("clientId", doc._id))
      .first();
    if (estimate) {
      throw appError("in_use", "estimates");
    }
    await ctx.db.delete("clients", doc._id);
    return null;
  },
});
