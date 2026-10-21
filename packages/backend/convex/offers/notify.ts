import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import { env, internalAction, internalQuery } from "../_generated/server";
import { emailHtml, escapeHtml, sendEmail } from "../lib/email";

// Tells whoever made an Ofertă's link that the client answered, by email when
// Resend is set up. The Deviz's page shows the answer either way.

/** Lei the Romanian way, 39.916,16, without relying on the runtime's Intl. */
export function formatLei(value: number): string {
  const [whole = "0", bani = "00"] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value < 0 ? "-" : ""}${grouped},${bani}`;
}

const detailsValidator = v.object({
  email: v.string(),
  accepted: v.boolean(),
  code: v.string(),
  title: v.string(),
  estimateId: v.id("estimates"),
  clientName: v.union(v.string(), v.null()),
  signerName: v.union(v.string(), v.null()),
  variantName: v.union(v.string(), v.null()),
  total: v.number(),
  reason: v.union(v.string(), v.null()),
});

type DecisionDetails = Infer<typeof detailsValidator>;

export const decisionDetails = internalQuery({
  args: { offerId: v.id("offers") },
  returns: v.union(detailsValidator, v.null()),
  handler: async (ctx, args): Promise<DecisionDetails | null> => {
    const offer = await ctx.db.get("offers", args.offerId);
    const estimate = offer
      ? await ctx.db.get("estimates", offer.estimateId)
      : null;
    const creator = offer ? await ctx.db.get("users", offer.createdBy) : null;
    if (
      !offer ||
      !estimate ||
      !creator?.email ||
      (offer.status !== "accepted" && offer.status !== "declined")
    ) {
      return null;
    }
    const client = estimate.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;
    const variant = offer.acceptedVariantId
      ? await ctx.db.get("variants", offer.acceptedVariantId)
      : null;
    const code = `DVZ-${String(estimate.number).padStart(4, "0")}`;
    return {
      email: creator.email,
      accepted: offer.status === "accepted",
      code: estimate.revision > 1 ? `${code}-R${estimate.revision}` : code,
      title: estimate.title,
      estimateId: estimate._id,
      clientName: client?.name ?? null,
      signerName: offer.signature?.name ?? null,
      variantName: variant?.name ?? null,
      total: offer.choice?.totals.total ?? estimate.totals.total,
      reason: offer.declineReason ?? null,
    };
  },
});

/** The email about a client's answer, in Romanian. */
export function decisionEmail(details: DecisionDetails, link: string) {
  const who = (details.clientName ?? "Clientul").slice(0, 80);
  const what = `oferta ${details.code} „${details.title.slice(0, 120)}”`;
  const lines = details.accepted
    ? [
        `${who} a acceptat ${what}.`,
        details.variantName ? `Varianta aleasă: ${details.variantName}.` : "",
        `Total acceptat: ${formatLei(details.total)} lei, cu TVA.`,
        details.signerName ? `Semnată online de ${details.signerName}.` : "",
      ]
    : [
        `${who} a refuzat ${what}.`,
        details.reason ? `Motivul: ${details.reason.slice(0, 1000)}` : "",
      ];
  const text = lines.filter(Boolean);
  return {
    subject: details.accepted
      ? `${who} a acceptat oferta ${details.code}`
      : `${who} a refuzat oferta ${details.code}`,
    text: [...text, "", `Vezi devizul: ${link}`].join("\n"),
    html: emailHtml(
      `${text
        .map(
          (line) =>
            `                <p style="margin:0 0 12px;font-size:15px">${escapeHtml(line)}</p>`,
        )
        .join("\n")}
                <p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1a1a18;color:#ffffff;font-size:15px;text-decoration:none">Vezi devizul</a></p>`,
    ),
  };
}

export const decision = internalAction({
  args: { offerId: v.id("offers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const site = env.SITE_URL?.trim().replace(/\/+$/, "");
    if (!env.AUTH_RESEND_KEY?.trim() || !site) {
      return null;
    }
    const details: DecisionDetails | null = await ctx.runQuery(
      internal.offers.notify.decisionDetails,
      args,
    );
    if (!details) {
      return null;
    }
    try {
      await sendEmail(
        details.email,
        decisionEmail(details, `${site}/estimates/${details.estimateId}`),
      );
    } catch (error) {
      // The Deviz's page shows the answer anyway.
      console.error(`The client's answer was not emailed: ${String(error)}`);
    }
    return null;
  },
});
