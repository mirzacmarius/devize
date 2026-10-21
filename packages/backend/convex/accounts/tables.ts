import { defineTable } from "convex/server";
import { v } from "convex/values";
import { markups } from "../estimates/validators";
import { resourceKind } from "../manufacturers/validators";
import {
  clientKind,
  filePurpose,
  invitationEmailStatus,
  invitedRole,
  memberRole,
  organizationKind,
} from "./validators";

export const accountTables = {
  // A Firmă: the account that owns devize, clients, rates and prices. Every
  // record below belongs to one, and only its members can see it.
  organizations: defineTable({
    name: v.string(),
    kind: organizationKind,
    // Codul unic de înregistrare, without the "RO" prefix.
    cui: v.optional(v.string()),
    // Număr de ordine în Registrul Comerțului, e.g. J40/123/2020.
    tradeRegister: v.optional(v.string()),
    address: v.optional(v.string()),
    county: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    // Firms that don't charge VAT start their devize with a VAT rate of 0.
    vatPayer: v.boolean(),
    defaultMarkups: markups,
    // The Producător this firm claimed.
    manufacturerId: v.optional(v.id("manufacturers")),
    // The last number given to one of the firm's devize.
    lastEstimateNumber: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_manufacturerId", ["manufacturerId"])
    .index("by_cui", ["cui"]),

  memberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: memberRole,
    // The firm a user worked in last opens first.
    lastActiveAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_organizationId_and_userId", ["organizationId", "userId"]),

  // Someone an admin asked to join a Firmă, by email. They accept from the
  // invitation's link, or in the app once they sign in with that address.
  // Accepted, declined and revoked invitations are deleted, and the rest
  // expire after a week (see accounts/invitations.ts).
  invitations: defineTable({
    organizationId: v.id("organizations"),
    // Lowercase, as people sign in with it.
    email: v.string(),
    role: invitedRole,
    // The secret part of the invitation's link.
    token: v.string(),
    invitedBy: v.id("users"),
    expiresAt: v.number(),
    // When the email was last asked for, so inviting again doesn't flood
    // the address.
    sentAt: v.number(),
    emailStatus: invitationEmailStatus,
  })
    .index("by_organizationId_and_email", ["organizationId", "email"])
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  // The invitation emails each user had sent in the last day, to cap them.
  invitationEmails: defineTable({
    userId: v.id("users"),
    sentAt: v.number(),
  }).index("by_userId_and_sentAt", ["userId", "sentAt"]),

  // The contractor's own clients, who receive Oferte.
  clients: defineTable({
    organizationId: v.id("organizations"),
    kind: clientKind,
    name: v.string(),
    nameKey: v.string(),
    cui: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_organizationId_and_nameKey", ["organizationId", "nameKey"])
    .searchIndex("search_nameKey", {
      searchField: "nameKey",
      filterFields: ["organizationId"],
    }),

  // The firm's own rates for labour, equipment and transport, in lei without
  // VAT per unit. A rate without a resource is the default for its kind, such
  // as one hourly rate for every trade. Material prices are Listări.
  companyRates: defineTable({
    organizationId: v.id("organizations"),
    kind: resourceKind,
    resourceId: v.optional(v.id("resources")),
    name: v.string(),
    unit: v.string(),
    price: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizationId_and_kind", ["organizationId", "kind"])
    .index("by_organizationId_and_resourceId", [
      "organizationId",
      "resourceId",
    ]),

  // Files a firm uploaded: datasheets, site photos, plans and tender
  // documents. The blobs are in Convex storage.
  files: defineTable({
    organizationId: v.id("organizations"),
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.optional(v.string()),
    size: v.number(),
    purpose: filePurpose,
    estimateId: v.optional(v.id("estimates")),
    uploadedBy: v.id("users"),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_estimateId", ["estimateId"])
    .index("by_storageId", ["storageId"]),
};
