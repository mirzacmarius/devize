import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { failJob, finishJob, startJob } from "../ai/jobs";
import { defaultModel } from "../ai/models";
import { aiUsage } from "../ai/validators";
import { isSuppressed } from "./admin";
import { draftInitialEmail } from "./drafts";
import {
  firmWords,
  isPersonAddress,
  mentions,
  REPORT_MS,
  scrubText,
} from "./lib/retention";
import { isEmail, normalizeEmail } from "./lib/text";
import { researchFindings } from "./validators";

/** Marks a research job running and returns what the model needs to know. */
export const begin = internalMutation({
  args: { jobId: v.id("aiJobs") },
  returns: v.union(
    v.null(),
    v.object({
      model: v.string(),
      manufacturer: v.object({
        name: v.string(),
        wave: v.number(),
        hints: v.optional(v.string()),
        website: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await startJob(ctx, args.jobId);
    if (!job?.manufacturerId) {
      return null;
    }
    const manufacturer = await ctx.db.get("manufacturers", job.manufacturerId);
    if (!manufacturer) {
      await failJob(ctx, job, "not_found");
      return null;
    }
    return {
      model: job.model ?? defaultModel,
      manufacturer: {
        name: manufacturer.name,
        wave: manufacturer.wave,
        hints: manufacturer.hints,
        website: manufacturer.website,
        notes: manufacturer.notes,
      },
    };
  },
});

/**
 * Stores what research found, replaces the contacts research found last time
 * (contacts added by hand stay) and drafts the first email.
 */
export const save = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    usage: aiUsage,
    report: v.string(),
    sources: v.array(
      v.object({ url: v.string(), title: v.optional(v.string()) }),
    ),
    findings: researchFindings,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("aiJobs", args.jobId);
    if (job?.status !== "running" || !job.manufacturerId) {
      return null;
    }
    const manufacturer = await ctx.db.get("manufacturers", job.manufacturerId);
    if (!manufacturer) {
      await failJob(ctx, job, "not_found", args.usage);
      return null;
    }
    const { contacts, recommendedEmail, ...fields } = args.findings;
    await ctx.db.patch("manufacturers", manufacturer._id, {
      ...fields,
      website: fields.website ?? manufacturer.website,
      normsStatus:
        manufacturer.normsStatus === "received"
          ? "received"
          : fields.existingNorms.length > 0
            ? "existing"
            : "none_found",
      status: manufacturer.status === "new" ? "review" : manufacturer.status,
      researchedAt: Date.now(),
    });

    // An address found again keeps the day it was first found, which starts
    // its clock (ADR 0043).
    const foundAt = new Map<string, number>();
    const previous = ctx.db
      .query("manufacturerContacts")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      );
    for await (const contact of previous) {
      if (contact.origin === "research") {
        if (contact.email) {
          const at = contact.foundAt ?? contact._creationTime;
          foundAt.set(
            contact.email,
            Math.min(foundAt.get(contact.email) ?? at, at),
          );
        }
        await ctx.db.delete("manufacturerContacts", contact._id);
      }
    }
    const now = Date.now();
    const stopped: string[] = [];
    const firm = firmWords({
      ...manufacturer,
      ...fields,
      website: fields.website ?? manufacturer.website,
    });
    for (const contact of contacts.slice(0, 20)) {
      const email = contact.email ? normalizeEmail(contact.email) : undefined;
      if (email ? !isEmail(email) : !contact.url) {
        continue;
      }
      // A person who asked us to stop isn't written down again.
      if (
        email &&
        isPersonAddress(email, firm, contact.kind) &&
        (await isSuppressed(ctx, email))
      ) {
        stopped.push(email);
        continue;
      }
      await ctx.db.insert("manufacturerContacts", {
        ...contact,
        email,
        manufacturerId: manufacturer._id,
        origin: "research",
        foundAt: (email && foundAt.get(email)) || now,
      });
    }

    const updated = await ctx.db.get("manufacturers", manufacturer._id);
    if (
      updated &&
      updated.status !== "excluded" &&
      updated.status !== "declined"
    ) {
      await draftInitialEmail(
        ctx,
        updated,
        recommendedEmail ? normalizeEmail(recommendedEmail) : undefined,
      );
    }
    await finishJob(ctx, job._id, {
      status: "succeeded",
      usage: args.usage,
      result: {
        report: scrubText(args.report, stopped),
        sources: args.sources.filter(
          (source) => !mentions(`${source.url} ${source.title ?? ""}`, stopped),
        ),
      },
      confidence: fields.confidence,
    });
    // The report names people, so it is deleted 25 days from now.
    const { reportsUntil } = manufacturer;
    if (reportsUntil !== undefined) {
      await ctx.db.patch("manufacturers", manufacturer._id, {
        reportsUntil: Math.min(
          reportsUntil || Number.POSITIVE_INFINITY,
          now + REPORT_MS,
        ),
      });
    }
    await ctx.scheduler.runAfter(0, internal.manufacturers.retention.review, {
      manufacturerId: manufacturer._id,
    });
    return null;
  },
});
