import { v } from "convex/values";

// How someone showed they work for a Producător: the link Devize emailed to
// the address it wrote with, a verified address on one of the producer's
// domains, or a request a super admin checked by hand.
export const claimMethod = v.union(
  v.literal("link"),
  v.literal("domain"),
  v.literal("manual"),
);

export const claimStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

export const removalStatus = v.union(
  v.literal("pending"),
  v.literal("removed"),
  v.literal("dismissed"),
);

// What ANAF's public register says about the CUI a claim gave. It shows that
// the firm exists, not that the person works there: CUIs are public.
export const anafRecord = v.object({
  outcome: v.union(
    v.literal("found"),
    v.literal("not_found"),
    v.literal("unavailable"),
  ),
  checkedAt: v.number(),
  name: v.optional(v.string()),
  address: v.optional(v.string()),
  tradeRegister: v.optional(v.string()),
  // ANAF's own words, such as "INREGISTRAT din data 05.03.1996".
  registration: v.optional(v.string()),
  inactive: v.optional(v.boolean()),
  vatPayer: v.optional(v.boolean()),
});
