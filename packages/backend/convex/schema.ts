import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { accountTables } from "./accounts/tables";
import { aiTables } from "./ai/tables";
import { catalogTables } from "./catalog/tables";
import { estimateTables } from "./estimates/tables";
import { manufacturerTables } from "./manufacturers/tables";
import { offerTables } from "./offers/tables";
import { priceTables } from "./prices/tables";
import { producerTables } from "./producers/tables";
import { proposalTables } from "./proposals/tables";

export default defineSchema({
  ...authTables,
  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // custom fields
    username: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    // Devize staff. Granted with `bunx convex run admin:grantSuperAdmin`.
    role: v.optional(v.literal("superadmin")),
  }).index("email", ["email"]),
  // When sign-in codes were emailed, so one address can't be flooded with
  // them (see emailSignIn.ts).
  emailCodeSends: defineTable({
    email: v.string(),
    sentAt: v.number(),
  }).index("by_email_and_sentAt", ["email", "sentAt"]),
  ...accountTables,
  ...catalogTables,
  ...priceTables,
  ...estimateTables,
  ...offerTables,
  ...aiTables,
  ...manufacturerTables,
  ...producerTables,
  ...proposalTables,
});
