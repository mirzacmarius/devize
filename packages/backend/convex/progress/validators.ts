import { v } from "convex/values";

// A Situație de lucrări starts as a draft the firm fills in, goes to the
// beneficiary, and is approved when the beneficiary (or their diriginte de
// șantier) confirms the quantities. Only an approved one is invoiced.
export const statementStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("approved"),
);

/**
 * One line of an Atașament: what was measured behind an executed quantity,
 * as count × length × width × height, or a quantity to subtract. The same
 * shape as a takeoff row, kept apart so the two can change on their own.
 */
export const attachmentRow = v.object({
  label: v.optional(v.string()),
  count: v.number(),
  length: v.optional(v.number()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  deduct: v.boolean(),
});

// The two receptions of HG 343/2017: at the end of the works, and the final
// one at the end of the warranty period.
export const receptionKind = v.union(
  v.literal("completion"),
  v.literal("final"),
);

export const receptionStatus = v.union(
  v.literal("draft"),
  v.literal("concluded"),
);

// What the committee decides (HG 343/2017): to admit the reception, to
// postpone it until the works it names are done, or to reject it.
export const receptionDecision = v.union(
  v.literal("admitted"),
  v.literal("postponed"),
  v.literal("rejected"),
);

// Who takes part in a reception: the committee (its president, members and
// the secretary, usually the diriginte de șantier), then those who attend
// for the executant and the designer, and anyone else invited.
export const receptionRole = v.union(
  v.literal("president"),
  v.literal("member"),
  v.literal("secretary"),
  v.literal("executant"),
  v.literal("designer"),
  v.literal("supervisor"),
  v.literal("invited"),
);

export const receptionPerson = v.object({
  name: v.string(),
  role: receptionRole,
  // The firm or institution they represent.
  organization: v.optional(v.string()),
});

export const receptionObjection = v.object({
  text: v.string(),
  // By when it is to be put right, YYYY-MM-DD.
  deadline: v.optional(v.string()),
});

// How the Garanție de bună execuție is held: kept back from each Situație
// de lucrări, or given at the start as a bank guarantee or an insurance
// policy.
export const guaranteeMethod = v.union(
  v.literal("retention"),
  v.literal("instrument"),
);

// The two releases of HG 395/2016 art. 42: 70 % after the PV de recepție
// la terminarea lucrărilor, 30 % after the PV de recepție finală.
export const guaranteeStage = receptionKind;

export const guaranteeRelease = v.object({
  stage: guaranteeStage,
  // Lei.
  amount: v.number(),
  // YYYY-MM-DD.
  date: v.string(),
  note: v.optional(v.string()),
});
