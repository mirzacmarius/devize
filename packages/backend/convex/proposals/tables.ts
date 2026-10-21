import { defineTable } from "convex/server";
import { v } from "convex/values";
import { aiConfidence } from "../ai/validators";
import { takeoffRow } from "../estimates/validators";
import {
  proposalSource,
  proposalStatus,
  proposedResource,
  tenderPosition,
  tenderProgress,
} from "./validators";

export const proposalTables = {
  // What the AI proposes for a Deviz. Nothing reaches the Deviz until a
  // person reviews the items and applies the ones they keep.
  proposals: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    aiJobId: v.id("aiJobs"),
    source: proposalSource,
    status: proposalStatus,
    // What the person gave: a description and photos, or a tender's lists
    // (files of the firm).
    text: v.optional(v.string()),
    fileIds: v.array(v.id("files")),
    // What the AI understood, what it had to assume and what it would ask
    // the client before pricing. An omissions check asks a tender's
    // contracting authority instead: the clarifications to request.
    summary: v.optional(v.string()),
    assumptions: v.array(v.string()),
    questions: v.array(v.string()),
    // An omissions check's remarks on the Deviz's own articles: quantities
    // that don't agree, works counted twice.
    remarks: v.optional(v.array(v.string())),
    // Why the items have no catalog norms, when matching them failed: the
    // proposal is still usable with the AI's own recipes.
    matchError: v.optional(v.string()),
    // A tender import's progress through its files.
    progress: v.optional(tenderProgress),
    createdBy: v.id("users"),
    // Who applied it, how many items go in and how many already did: the
    // items go into the Deviz in position order, a batch at a time.
    appliedBy: v.optional(v.id("users")),
    applyTotal: v.optional(v.number()),
    applied: v.optional(v.number()),
    appliedThrough: v.optional(v.number()),
    appliedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_estimateId_and_source", ["estimateId", "source"])
    .index("by_organizationId", ["organizationId"]),

  // One proposed Articol de deviz, in the order the AI wrote them or the
  // tender's lists have them.
  proposalItems: defineTable({
    organizationId: v.id("organizations"),
    proposalId: v.id("proposals"),
    position: v.number(),
    // The Capitol it goes in, by name; empty for a tender position outside
    // any chapter.
    chapter: v.string(),
    title: v.string(),
    // The quantity measured, in the article's own unit: the total of its
    // Antemăsurătoare, whose rows say how it was measured, or the quantity
    // a tender's list gives.
    unit: v.string(),
    measured: v.number(),
    takeoff: v.array(takeoffRow),
    note: v.optional(v.string()),
    confidence: aiConfidence,
    // The catalog norm the item uses, if one fits, and the norms found for
    // it, which the person can pick instead.
    normId: v.optional(v.id("norms")),
    candidateIds: v.array(v.id("norms")),
    matchNote: v.optional(v.string()),
    // The quantity that goes in the Deviz: in the norm's unit when it uses
    // a norm, else in the article's unit.
    quantity: v.number(),
    // The AI's own resources per unit, for an article no norm fits.
    resources: v.array(proposedResource),
    // For a tender's position: how the list writes it.
    tender: v.optional(tenderPosition),
    // For a work an omissions check finds missing: the Deviz's articles
    // that call for it, and the one that seems to have it after all (same
    // norm or same name), which leaves it out.
    basis: v.optional(v.array(v.id("lineItems"))),
    duplicateOf: v.optional(v.id("lineItems")),
    selected: v.boolean(),
  }).index("by_proposalId_and_position", ["proposalId", "position"]),
};
