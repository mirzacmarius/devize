import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { optionalText } from "../accounts/identifiers";
import { readNormResources } from "../catalog/norms";
import { insertEstimate, newEstimateArgs } from "../estimates/estimates";
import {
  pricedFields,
  readLineItems,
  readSections,
  refreshTotals,
  resolverFor,
  snapshotResources,
} from "../estimates/helpers";
import { getMembership, requireFirmDoc, requireMember } from "../lib/access";
import { appError, forbidden, invalid, notFound } from "../lib/errors";
import { normalizeText } from "../lib/text";
import {
  type Starter,
  starterLines,
  starterOf,
  starters,
  starterValues,
} from "./starters";
import { starterChoice } from "./validators";

// Șabloane de deviz: a firm saves a Deviz to start the next ones from, and
// Devize's own starters measure the usual jobs from a few dimensions.
// See docs/adr/0040.

export const MAX_TEMPLATES = 200;
export const MAX_TEMPLATE_ITEMS = 300;
// Under Convex's 1 MB a document, with room to spare.
const MAX_TEMPLATE_BYTES = 800_000;

function cleanName(name: string): string {
  const result = name.trim().replace(/\s+/g, " ");
  if (!result || result.length > 120) {
    throw invalid("templateName");
  }
  return result;
}

async function byName(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  nameKey: string,
) {
  return await ctx.db
    .query("estimateTemplates")
    .withIndex("by_organizationId_and_nameKey", (q) =>
      q.eq("organizationId", organizationId).eq("nameKey", nameKey),
    )
    .first();
}

/** Members change the templates they made; admins change all of them. */
async function canChange(
  ctx: QueryCtx,
  template: Doc<"estimateTemplates">,
  userId: Id<"users">,
) {
  if (template.createdBy === userId) {
    return true;
  }
  const membership = await getMembership(ctx, template.organizationId, userId);
  return membership !== null && membership.role !== "member";
}

async function requireChange(
  ctx: QueryCtx,
  template: Doc<"estimateTemplates">,
  userId: Id<"users">,
) {
  if (!(await canChange(ctx, template, userId))) {
    throw forbidden("admin");
  }
}

/** A template's contents row, if it has one. */
async function contentsRow(ctx: QueryCtx, templateId: Id<"estimateTemplates">) {
  return await ctx.db
    .query("estimateTemplateContents")
    .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
    .unique();
}

/** A template's sections and works, wherever it keeps them. */
async function contentsOf(ctx: QueryCtx, template: Doc<"estimateTemplates">) {
  const row = await contentsRow(ctx, template._id);
  return {
    sections: row?.sections ?? template.sections ?? [],
    lineItems: row?.lineItems ?? template.lineItems ?? [],
  };
}

/** The published Normă de bază with this code, if the catalog has it. */
async function baseNorm(ctx: QueryCtx, code: string) {
  const rows = ctx.db
    .query("norms")
    .withIndex("by_visibility_and_status_and_code", (q) =>
      q.eq("visibility", "public").eq("status", "published").eq("code", code),
    );
  for await (const norm of rows) {
    if (norm.source === "base") {
      return norm;
    }
  }
  return null;
}

/** The codes of a starter the published catalog lacks. */
async function missingCodes(ctx: QueryCtx, starter: Starter) {
  const missing: string[] = [];
  for (const code of new Set(starter.lines.map((line) => line.code))) {
    if (!(await baseNorm(ctx, code))) {
      missing.push(code);
    }
  }
  return missing;
}

/** The firm's templates by name, and which of Devize's starters it can use. */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { userId, membership } = await requireMember(
      ctx,
      args.organizationId,
    );
    const admin = membership.role !== "member";
    const templates = await ctx.db
      .query("estimateTemplates")
      .withIndex("by_organizationId_and_nameKey", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(MAX_TEMPLATES);
    return {
      templates: templates.map((template) => ({
        _id: template._id,
        name: template.name,
        description: template.description,
        itemCount: template.itemCount ?? template.lineItems?.length ?? 0,
        sectionCount: template.sectionCount ?? template.sections?.length ?? 0,
        total: template.total,
        updatedAt: template.updatedAt,
        usedCount: template.usedCount,
        lastUsedAt: template.lastUsedAt,
        canChange: admin || template.createdBy === userId,
      })),
      starters: await Promise.all(
        starters.map(async (starter) => ({
          key: starter.key,
          // Usable once any norm it is written with is published; starting
          // it leaves out and names the works whose norm isn't.
          available:
            (await missingCodes(ctx, starter)).length <
            new Set(starter.lines.map((line) => line.code)).size,
        })),
      ),
    };
  },
});

/** The works of a Deviz as a template keeps them. */
async function snapshot(ctx: QueryCtx, estimate: Doc<"estimates">) {
  const sections = await readSections(ctx, estimate._id);
  const items = await readLineItems(ctx, estimate._id);
  if (items.length === 0) {
    throw invalid("templateItems");
  }
  if (items.length > MAX_TEMPLATE_ITEMS) {
    throw invalid("templateSize");
  }
  const content = {
    sections: sections.map((section) => ({
      key: section._id,
      kind: section.kind,
      parentKey: section.parentId,
      code: section.code,
      name: section.name,
      position: section.position,
    })),
    // What a template doesn't keep: a tender's positions, an AI's
    // confidence and its job, which belong to their Deviz.
    lineItems: items.map((item) => ({
      sectionKey: item.sectionId,
      position: item.position,
      origin: item.origin,
      normId: item.normId,
      code: item.code,
      title: item.title,
      unit: item.unit,
      quantity: item.quantity,
      resources: item.resources,
      unitCost: item.unitCost,
      laborHours: item.laborHours,
      notes: item.notes,
      layout: item.layout,
    })),
  };
  if (JSON.stringify(content).length > MAX_TEMPLATE_BYTES) {
    throw invalid("templateSize");
  }
  return content;
}

/**
 * Saves a Deviz as a template: its sections and works with their quantities
 * and resources. A name already taken replaces that template when asked to,
 * and is refused otherwise.
 */
export const save = mutation({
  args: {
    estimateId: v.id("estimates"),
    name: v.string(),
    description: v.optional(v.string()),
    replace: v.optional(v.boolean()),
  },
  returns: v.id("estimateTemplates"),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const name = cleanName(args.name);
    const nameKey = normalizeText(name);
    const description = optionalText(args.description, 1000);
    const content = await snapshot(ctx, estimate);
    const fields = {
      name,
      nameKey,
      description,
      itemCount: content.lineItems.length,
      sectionCount: content.sections.length,
      total: estimate.totals.total,
      sourceEstimateId: estimate._id,
      updatedAt: Date.now(),
    };
    const existing = await byName(ctx, estimate.organizationId, nameKey);
    if (existing) {
      // A name only someone else may replace is simply taken.
      if (!(await canChange(ctx, existing, userId))) {
        throw appError("in_use", "templateNameTaken");
      }
      if (!args.replace) {
        throw appError("in_use", "templateName");
      }
      await ctx.db.patch("estimateTemplates", existing._id, {
        ...fields,
        sections: undefined,
        lineItems: undefined,
      });
      const row = await contentsRow(ctx, existing._id);
      if (row) {
        await ctx.db.patch("estimateTemplateContents", row._id, content);
      } else {
        await ctx.db.insert("estimateTemplateContents", {
          templateId: existing._id,
          ...content,
        });
      }
      return existing._id;
    }
    const count = await ctx.db
      .query("estimateTemplates")
      .withIndex("by_organizationId_and_nameKey", (q) =>
        q.eq("organizationId", estimate.organizationId),
      )
      .take(MAX_TEMPLATES);
    if (count.length >= MAX_TEMPLATES) {
      throw invalid("templates");
    }
    const templateId = await ctx.db.insert("estimateTemplates", {
      organizationId: estimate.organizationId,
      ...fields,
      createdBy: userId,
      usedCount: 0,
    });
    await ctx.db.insert("estimateTemplateContents", { templateId, ...content });
    return templateId;
  },
});

/** Renames a template or changes what it says it is for. */
export const rename = mutation({
  args: {
    templateId: v.id("estimateTemplates"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: template, userId } = await requireFirmDoc(
      ctx,
      "estimateTemplates",
      args.templateId,
    );
    await requireChange(ctx, template, userId);
    const name = cleanName(args.name);
    const nameKey = normalizeText(name);
    const existing = await byName(ctx, template.organizationId, nameKey);
    if (existing && existing._id !== template._id) {
      throw appError("in_use", "templateName");
    }
    await ctx.db.patch("estimateTemplates", template._id, {
      name,
      nameKey,
      description: optionalText(args.description, 1000),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Deletes a template; the devize started from it stay as they are. */
export const remove = mutation({
  args: { templateId: v.id("estimateTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: template, userId } = await requireFirmDoc(
      ctx,
      "estimateTemplates",
      args.templateId,
    );
    await requireChange(ctx, template, userId);
    const row = await contentsRow(ctx, template._id);
    if (row) {
      await ctx.db.delete("estimateTemplateContents", row._id);
    }
    await ctx.db.delete("estimateTemplates", template._id);
    return null;
  },
});

/**
 * Copies a template's works into a new Deviz with the firm's prices today:
 * every resource whose price wasn't typed by hand is priced again.
 */
async function applyTemplate(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  template: Doc<"estimateTemplates">,
) {
  const { sections, lineItems } = await contentsOf(ctx, template);
  const sectionIds = new Map<string, Id<"sections">>();
  for (const section of sections) {
    sectionIds.set(
      section.key,
      await ctx.db.insert("sections", {
        organizationId: estimate.organizationId,
        estimateId: estimate._id,
        kind: section.kind,
        code: section.code,
        name: section.name,
        position: section.position,
      }),
    );
  }
  for (const section of sections) {
    const id = sectionIds.get(section.key);
    const parentId = section.parentKey
      ? sectionIds.get(section.parentKey)
      : undefined;
    if (id && parentId) {
      await ctx.db.patch("sections", id, { parentId });
    }
  }
  const resolver = resolverFor(ctx, estimate);
  const now = Date.now();
  for (const item of lineItems) {
    const resources: Doc<"lineItems">["resources"] = [];
    for (const resource of item.resources) {
      if (resource.priceSource === "manual") {
        resources.push(resource);
        continue;
      }
      const price = await resolver.resolve(resource);
      resources.push({
        ...resource,
        unitPrice: price.unitPrice,
        priceSource: price.priceSource,
        listingId: price.listingId,
        store: price.store,
        pricedAt: price.pricedAt ?? now,
      });
    }
    await ctx.db.insert("lineItems", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      sectionId: item.sectionKey ? sectionIds.get(item.sectionKey) : undefined,
      position: item.position,
      origin: item.origin,
      normId: item.normId,
      code: item.code,
      title: item.title,
      unit: item.unit,
      quantity: item.quantity,
      notes: item.notes,
      layout: item.layout,
      ...pricedFields(resources),
      updatedAt: now,
    });
  }
  await ctx.db.patch("estimateTemplates", template._id, {
    usedCount: template.usedCount + 1,
    lastUsedAt: now,
  });
}

/**
 * Writes a starter's works into a new Deviz, from the Norme de bază with the
 * firm's prices today. Returns the codes the published catalog lacks; with
 * none of them published, nothing is made.
 */
async function applyStarter(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  choice: { key: string; values: Record<string, number> },
): Promise<string[]> {
  const starter = starterOf(choice.key);
  if (!starter) {
    throw invalid("starter");
  }
  const values = starterValues(starter, choice.values);
  if (!values) {
    throw invalid("starterValues");
  }
  const lines = starterLines(starter, values);
  const resolver = resolverFor(ctx, estimate);
  const sectionIds = new Map<string, Id<"sections">>();
  const skipped: string[] = [];
  let position = 1;
  for (const line of lines) {
    const norm = await baseNorm(ctx, line.code);
    if (!norm) {
      skipped.push(line.code);
      continue;
    }
    let sectionId = sectionIds.get(line.section);
    if (!sectionId) {
      sectionId = await ctx.db.insert("sections", {
        organizationId: estimate.organizationId,
        estimateId: estimate._id,
        kind: "chapter",
        name: line.section,
        position: sectionIds.size + 1,
      });
      sectionIds.set(line.section, sectionId);
    }
    const resources = await snapshotResources(
      await readNormResources(ctx, norm._id),
      resolver,
    );
    await ctx.db.insert("lineItems", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      sectionId,
      position: position++,
      origin: "norm",
      normId: norm._id,
      code: norm.code,
      title: norm.title,
      unit: norm.unit,
      quantity: line.quantity,
      ...pricedFields(resources),
      updatedAt: Date.now(),
    });
  }
  if (sectionIds.size === 0) {
    throw notFound("baseCatalog");
  }
  return skipped;
}

/**
 * Starts a Deviz from one of the firm's templates or from one of Devize's
 * starters, with the same details as a new Deviz.
 */
export const start = mutation({
  args: {
    ...newEstimateArgs,
    templateId: v.optional(v.id("estimateTemplates")),
    starter: v.optional(starterChoice),
  },
  returns: v.object({
    estimateId: v.id("estimates"),
    // Codes of a starter's works the published catalog lacks.
    skipped: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { templateId, starter, ...details } = args;
    if ((templateId === undefined) === (starter === undefined)) {
      throw invalid("template");
    }
    const { userId } = await requireMember(ctx, args.organizationId);
    let template: Doc<"estimateTemplates"> | null = null;
    if (templateId) {
      template = await ctx.db.get("estimateTemplates", templateId);
      if (!template || template.organizationId !== args.organizationId) {
        throw notFound("estimateTemplates");
      }
    }
    const estimateId = await insertEstimate(ctx, details, userId);
    const estimate = await ctx.db.get("estimates", estimateId);
    if (!estimate) {
      throw notFound("estimates");
    }
    let skipped: string[] = [];
    if (template) {
      await applyTemplate(ctx, estimate, template);
    } else if (starter) {
      skipped = await applyStarter(ctx, estimate, starter);
    }
    await refreshTotals(ctx, estimate);
    return { estimateId, skipped };
  },
});
