import { defineTable } from "convex/server";
import { v } from "convex/values";
import { amountsByKind, markups, recap } from "../estimates/validators";
import {
  attachmentRow,
  guaranteeMethod,
  guaranteeRelease,
  receptionDecision,
  receptionKind,
  receptionObjection,
  receptionPerson,
  receptionStatus,
  statementStatus,
} from "./validators";

export const progressTables = {
  // Situații de lucrări: what of an accepted Deviz was executed in a
  // period, article by article, with the period's own Recapitulație. The
  // rows snapshot the contract, so the statements of a Deviz agree with each
  // other whatever happens to the Deviz later. See docs/adr/0035.
  workStatements: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    // 1, 2, 3… for each Deviz.
    number: v.number(),
    status: statementStatus,
    // The period the works were executed in, YYYY-MM-DD.
    periodStart: v.string(),
    periodEnd: v.string(),
    // The day the statement is drawn up, YYYY-MM-DD.
    date: v.string(),
    notes: v.optional(v.string()),
    // The Deviz's Cote, copied when the statement starts.
    markups: markups,
    // The period's Recapitulație: the executed quantities at the contract's
    // unit costs, with the Cote on top.
    totals: recap,
    // The Garanție de bună execuție kept back from this statement, in lei
    // without VAT; 0 when the guarantee isn't held by retention.
    retention: v.number(),
    sentAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    // Who confirmed the quantities for the beneficiary.
    approvedBy: v.optional(v.string()),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_estimateId_and_number", ["estimateId", "number"])
    .index("by_organizationId_and_updatedAt", ["organizationId", "updatedAt"]),

  // One row of a Situație de lucrări: an Articol as contracted, what of it
  // was executed before this statement and in it. What remains follows.
  workStatementRows: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    statementId: v.id("workStatements"),
    lineItemId: v.id("lineItems"),
    position: v.number(),
    // The Obiect and Capitol the Articol sits in, as the Deviz prints them.
    group: v.optional(v.string()),
    code: v.string(),
    title: v.string(),
    unit: v.string(),
    contractQuantity: v.number(),
    // Lei per unit as contracted: the accepted Ofertă's choice, with the
    // Variantă's products in place of the Deviz's own.
    unitCost: amountsByKind,
    laborHours: v.number(),
    // Executed in the earlier statements.
    previousQuantity: v.number(),
    // Executed in this statement's period.
    quantity: v.number(),
    // The Atașament: the measurements behind `quantity`.
    attachment: v.array(attachmentRow),
    updatedAt: v.number(),
  })
    .index("by_statementId_and_position", ["statementId", "position"])
    .index("by_estimateId", ["estimateId"]),

  // Procesele-verbale de recepție of HG 343/2017: at the end of the works
  // and the final one at the end of the warranty period. Devize keeps what
  // the PV says and draws it; it is signed on paper.
  receptions: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    kind: receptionKind,
    status: receptionStatus,
    // The PV's own number, as the beneficiary registers it.
    number: v.optional(v.string()),
    // When and where it was drawn up, YYYY-MM-DD.
    date: v.string(),
    place: v.optional(v.string()),
    // The contract the works were executed under.
    contract: v.optional(
      v.object({ number: v.string(), date: v.optional(v.string()) }),
    ),
    // The building permit, for works that needed one.
    permit: v.optional(
      v.object({
        number: v.string(),
        date: v.optional(v.string()),
        issuer: v.optional(v.string()),
        validUntil: v.optional(v.string()),
      }),
    ),
    // When the works were executed.
    executionStart: v.optional(v.string()),
    executionEnd: v.optional(v.string()),
    // When the committee did its work.
    committeeStart: v.optional(v.string()),
    committeeEnd: v.optional(v.string()),
    // For the final reception: the warranty period that ended, in months.
    warrantyMonths: v.optional(v.number()),
    people: v.array(receptionPerson),
    // What the committee found.
    findings: v.optional(v.string()),
    objections: v.array(receptionObjection),
    decision: v.optional(receptionDecision),
    // Why it decided so, and the measures it recommends.
    reasons: v.optional(v.string()),
    measures: v.optional(v.string()),
    // The value of the works received, lei without VAT, as the approved
    // statements add up when the PV is concluded.
    value: v.optional(v.number()),
    // How many copies were made.
    copies: v.optional(v.number()),
    concludedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_estimateId_and_kind", ["estimateId", "kind"]),

  // The Garanție de bună execuție of a Deviz: its share of the contract, how
  // it is held and when parts of it were given back.
  guarantees: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    // Of the contract value without VAT, at most 10 (HG 395/2016 art. 40).
    percent: v.number(),
    method: guaranteeMethod,
    // The bank guarantee or insurance policy, when it is held that way.
    instrument: v.optional(
      v.object({
        issuer: v.string(),
        reference: v.string(),
        amount: v.number(),
        validUntil: v.optional(v.string()),
      }),
    ),
    releases: v.array(guaranteeRelease),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_estimateId", ["estimateId"]),
};
