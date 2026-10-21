import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import { env, internalAction, internalQuery } from "../_generated/server";
import { emailHtml, escapeHtml, sendEmail } from "../lib/email";
import { estimateCode } from "./helpers";

// Tells whoever made an Ofertă's link that the client answered it, or asked
// something only the firm can answer, by email when Resend is set up. The
// Deviz's page shows both either way, and a failed email changes nothing.

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
    return {
      email: creator.email,
      accepted: offer.status === "accepted",
      code: estimateCode(estimate),
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

const questionDetailsValidator = v.object({
  email: v.string(),
  code: v.string(),
  title: v.string(),
  estimateId: v.id("estimates"),
  clientName: v.union(v.string(), v.null()),
  question: v.string(),
  answer: v.union(v.string(), v.null()),
});

type QuestionDetails = Infer<typeof questionDetailsValidator>;

export const questionDetails = internalQuery({
  args: { questionId: v.id("offerQuestions") },
  returns: v.union(questionDetailsValidator, v.null()),
  handler: async (ctx, args): Promise<QuestionDetails | null> => {
    const question = await ctx.db.get("offerQuestions", args.questionId);
    const offer = question
      ? await ctx.db.get("offers", question.offerId)
      : null;
    const estimate = offer
      ? await ctx.db.get("estimates", offer.estimateId)
      : null;
    const creator = offer ? await ctx.db.get("users", offer.createdBy) : null;
    if (question?.status !== "waiting" || !estimate || !creator?.email) {
      return null;
    }
    const client = estimate.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;
    return {
      email: creator.email,
      code: estimateCode(estimate),
      title: estimate.title,
      estimateId: estimate._id,
      clientName: client?.name ?? null,
      question: question.question,
      answer: question.answer ?? null,
    };
  },
});

/** The email about a question the firm should answer, in Romanian. */
export function questionEmail(details: QuestionDetails, link: string) {
  const who = (details.clientName ?? "Clientul").slice(0, 80);
  const lines = [
    `${who} are o întrebare despre oferta ${details.code} „${details.title.slice(0, 120)}”:`,
    `„${details.question.slice(0, 1000)}”`,
    details.answer
      ? `Asistentul i-a răspuns „${details.answer.slice(0, 1000)}”, dar întrebarea e pentru tine.`
      : "",
    "Ce îi răspunzi din pagina devizului apare pe pagina ofertei.",
  ].filter(Boolean);
  return {
    subject: `${who} are o întrebare despre oferta ${details.code}`,
    text: [...lines, "", `Răspunde: ${link}`].join("\n"),
    html: emailHtml(
      `${lines
        .map(
          (line) =>
            `                <p style="margin:0 0 12px;font-size:15px">${escapeHtml(line)}</p>`,
        )
        .join("\n")}
                <p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1a1a18;color:#ffffff;font-size:15px;text-decoration:none">Răspunde</a></p>`,
    ),
  };
}

export const question = internalAction({
  args: { questionId: v.id("offerQuestions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const site = env.SITE_URL?.trim().replace(/\/+$/, "");
    if (!env.AUTH_RESEND_KEY?.trim() || !site) {
      return null;
    }
    const details: QuestionDetails | null = await ctx.runQuery(
      internal.offers.notify.questionDetails,
      args,
    );
    if (!details) {
      return null;
    }
    try {
      await sendEmail(
        details.email,
        questionEmail(details, `${site}/estimates/${details.estimateId}`),
      );
    } catch (error) {
      // The Deviz's page shows the question anyway.
      console.error(`The client's question was not emailed: ${String(error)}`);
    }
    return null;
  },
});
