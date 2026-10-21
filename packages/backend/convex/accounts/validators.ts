import { v } from "convex/values";

// Constructor, Producător or Furnizor (see GLOSSARY.md).
export const organizationKind = v.union(
  v.literal("contractor"),
  v.literal("manufacturer"),
  v.literal("supplier"),
);

// Owners and admins manage the firm, its members and its rates; members work
// on devize, clients and the firm's own norms.
export const memberRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

// The roles someone can be invited with; an owner makes another owner later.
export const invitedRole = v.union(v.literal("admin"), v.literal("member"));

// Whether an invitation's email went out. Without Resend set up, or when
// Resend refuses it, the admin shares the invitation's link another way.
export const invitationEmailStatus = v.union(
  v.literal("sending"),
  v.literal("sent"),
  v.literal("not_sent"),
);

export const clientKind = v.union(v.literal("person"), v.literal("company"));

export const filePurpose = v.union(
  v.literal("datasheet"),
  v.literal("photo"),
  v.literal("plan"),
  v.literal("tender"),
  v.literal("other"),
);
