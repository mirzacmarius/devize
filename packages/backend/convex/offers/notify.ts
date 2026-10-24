import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { emailHtml, escapeHtml, sendEmail } from "../lib/email";
import {
  formatBucharest,
  WITHDRAWAL_DAYS,
  withdrawalDeadline,
} from "./consumer";
import { estimateCode } from "./helpers";
import { describeSchedule, triggerWords } from "./payments";
import { paymentStage } from "./validators";

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

const confirmationDetailsValidator = v.object({
  email: v.string(),
  token: v.string(),
  code: v.string(),
  title: v.string(),
  firm: v.object({
    name: v.string(),
    email: v.union(v.string(), v.null()),
    phone: v.union(v.string(), v.null()),
  }),
  signerName: v.string(),
  signedAt: v.number(),
  variantName: v.union(v.string(), v.null()),
  total: v.number(),
  withVat: v.boolean(),
  paymentSchedule: v.array(paymentStage),
  consumer: v.boolean(),
  earlyStart: v.boolean(),
  contentHash: v.union(v.string(), v.null()),
});

type ConfirmationDetails = Infer<typeof confirmationDetailsValidator>;

/** What the client's confirmation says, or null when they have no email. */
export const confirmationDetails = internalQuery({
  args: { offerId: v.id("offers") },
  returns: v.union(confirmationDetailsValidator, v.null()),
  handler: async (ctx, args): Promise<ConfirmationDetails | null> => {
    const offer = await ctx.db.get("offers", args.offerId);
    const estimate = offer
      ? await ctx.db.get("estimates", offer.estimateId)
      : null;
    const firm = offer
      ? await ctx.db.get("organizations", offer.organizationId)
      : null;
    const client = estimate?.clientId
      ? await ctx.db.get("clients", estimate.clientId)
      : null;
    if (
      !offer ||
      !estimate ||
      !firm ||
      offer.status !== "accepted" ||
      !offer.signature ||
      !client?.email
    ) {
      return null;
    }
    const variant = offer.acceptedVariantId
      ? await ctx.db.get("variants", offer.acceptedVariantId)
      : null;
    const totals = offer.choice?.totals ?? estimate.totals;
    return {
      email: client.email,
      token: offer.token,
      code: estimateCode(estimate),
      title: estimate.title,
      firm: {
        name: firm.name,
        email: firm.email ?? null,
        phone: firm.phone ?? null,
      },
      signerName: offer.signature.name,
      signedAt: offer.signature.signedAt,
      variantName: variant?.name ?? null,
      total: totals.total,
      withVat: totals.vat !== 0,
      paymentSchedule: offer.paymentSchedule ?? [],
      consumer: offer.consumer ?? false,
      earlyStart: offer.signature.earlyStart ?? false,
      contentHash: offer.signature.contentHash ?? null,
    };
  },
});

/**
 * The confirmation a client gets after accepting: what they accepted, how it
 * is paid, their right to withdraw when they are a consumer (OUG 34/2014,
 * art. 8), the code of the signed document and where its copy is.
 */
export function confirmationEmail(details: ConfirmationDetails, link: string) {
  const { date, time } = formatBucharest(details.signedAt);
  const until = formatBucharest(withdrawalDeadline(details.signedAt)).date;
  const what = `oferta ${details.code} „${details.title.slice(0, 120)}”`;
  const contacts = [
    details.firm.email && `email ${details.firm.email}`,
    details.firm.phone && `telefon ${details.firm.phone}`,
  ].filter(Boolean);
  const lines = [
    `Ați acceptat ${what} de la ${details.firm.name} pe ${date}, la ${time}, semnând electronic ca ${details.signerName}.`,
    details.variantName ? `Varianta aleasă: ${details.variantName}.` : "",
    `Total acceptat: ${formatLei(details.total)} lei${details.withVat ? ", cu TVA" : ""}.`,
    details.paymentSchedule.length > 0
      ? `Plata: ${describeSchedule(
          details.paymentSchedule,
          details.total,
          formatLei,
          (trigger) => triggerWords[trigger],
        ).join("; ")}.`
      : "",
    details.consumer
      ? `Dreptul de retragere: fiind consumator, puteți renunța la acest contract fără să dați un motiv în ${WITHDRAWAL_DAYS} zile de la acceptare, până pe ${until}, printr-o declarație neechivocă trimisă firmei${
          details.firm.email ? ` la ${details.firm.email}` : ""
        }. Formularul de retragere se descarcă de pe pagina ofertei (OUG 34/2014).`
      : "",
    details.consumer
      ? details.earlyStart
        ? "Ați cerut ca lucrările să înceapă în acest termen: dacă vă retrageți, plătiți lucrările executate până atunci."
        : "Dacă cereți începerea lucrărilor înainte de expirarea acestui termen, la retragere plătiți lucrările executate până atunci."
      : "",
    details.contentHash
      ? `Codul de verificare al documentului semnat (SHA-256): ${details.contentHash}.`
      : "",
    contacts.length > 0
      ? `Pentru orice întrebare, scrieți firmei ${details.firm.name}: ${contacts.join(", ")}.`
      : "",
  ].filter(Boolean);
  return {
    subject: `Confirmare: ați acceptat oferta ${details.code} de la ${details.firm.name}`,
    text: [...lines, "", `Copia semnată a ofertei, în PDF: ${link}`].join("\n"),
    html: emailHtml(
      `${lines
        .map(
          (line) =>
            `                <p style="margin:0 0 12px;font-size:15px">${escapeHtml(line)}</p>`,
        )
        .join("\n")}
                <p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1a1a18;color:#ffffff;font-size:15px;text-decoration:none">Vezi oferta semnată</a></p>`,
    ),
  };
}

/** Emails the client their confirmation, and records where it went. */
export const confirmation = internalAction({
  args: { offerId: v.id("offers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const site = env.SITE_URL?.trim().replace(/\/+$/, "");
    if (!env.AUTH_RESEND_KEY?.trim() || !site) {
      return null;
    }
    const details: ConfirmationDetails | null = await ctx.runQuery(
      internal.offers.notify.confirmationDetails,
      args,
    );
    if (!details) {
      return null;
    }
    try {
      await sendEmail(
        details.email,
        confirmationEmail(details, `${site}/o/${details.token}`),
      );
    } catch (error) {
      // The signed copy stays on the offer's page either way.
      console.error(
        `The client's confirmation was not emailed: ${String(error)}`,
      );
      return null;
    }
    await ctx.runMutation(internal.offers.notify.recordConfirmation, {
      offerId: args.offerId,
      email: details.email,
    });
    return null;
  },
});

export const recordConfirmation = internalMutation({
  args: { offerId: v.id("offers"), email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const offer = await ctx.db.get("offers", args.offerId);
    if (offer?.status === "accepted") {
      await ctx.db.patch("offers", offer._id, {
        confirmation: { email: args.email, sentAt: Date.now() },
      });
    }
    return null;
  },
});
