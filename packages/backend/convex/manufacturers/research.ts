import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { failJob, finishJob, startJob } from "../ai/jobs";
import { defaultModel } from "../ai/models";
import { aiUsage } from "../ai/validators";
import { draftInitialEmail } from "./drafts";
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

    const previous = ctx.db
      .query("manufacturerContacts")
      .withIndex("by_manufacturerId", (q) =>
        q.eq("manufacturerId", manufacturer._id),
      );
    for await (const contact of previous) {
      if (contact.origin === "research") {
        await ctx.db.delete("manufacturerContacts", contact._id);
      }
    }
    for (const contact of contacts.slice(0, 20)) {
      const email = contact.email ? normalizeEmail(contact.email) : undefined;
      if (email ? !isEmail(email) : !contact.url) {
        continue;
      }
      await ctx.db.insert("manufacturerContacts", {
        ...contact,
        email,
        manufacturerId: manufacturer._id,
        origin: "research",
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
      result: { report: args.report, sources: args.sources },
      confidence: fields.confidence,
    });
    return null;
  },
});
