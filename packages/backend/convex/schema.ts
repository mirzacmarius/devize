import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { aiTables } from "./ai/tables";
import { manufacturerTables } from "./manufacturers/tables";

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
  ...aiTables,
  ...manufacturerTables,
});
