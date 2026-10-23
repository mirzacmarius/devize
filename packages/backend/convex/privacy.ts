import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { env, query } from "./_generated/server";

/** Devize's privacy page, or null when SITE_URL isn't set. */
export function privacyPageUrl(): string | null {
  const site = env.SITE_URL?.trim().replace(/\/+$/, "");
  return site ? `${site}/confidentialitate` : null;
}

const controllerFields = {
  name: v.optional(v.string()),
  registration: v.optional(v.string()),
  address: v.optional(v.string()),
  email: v.optional(v.string()),
};

export type Controller = {
  name?: string;
  registration?: string;
  address?: string;
  email?: string;
};

/**
 * Who answers for the personal data in Devize (the GDPR controller), as a
 * super admin wrote it in Admin → Setări.
 */
export async function getController(ctx: QueryCtx): Promise<Controller> {
  const settings = await ctx.db.query("outreachSettings").first();
  return {
    name: settings?.controllerName,
    registration: settings?.controllerRegistration,
    address: settings?.controllerAddress,
    email: settings?.controllerEmail,
  };
}

/**
 * Whether the privacy page says who the controller is and where to write to
 * them, which the GDPR asks of it before anyone is emailed.
 */
export function namesController(controller: Controller): boolean {
  return Boolean(controller.name && controller.email);
}

/** The controller's details on the privacy page, which anyone can open. */
export const controller = query({
  args: {},
  returns: v.object(controllerFields),
  handler: async (ctx) => await getController(ctx),
});
