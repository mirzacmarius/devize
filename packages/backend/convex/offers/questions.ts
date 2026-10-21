import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { createJob, failJob, finishJob, startJob } from "../ai/jobs";
import { aiModel } from "../ai/models";
import { aiUsage } from "../ai/validators";
import { requireFirmDoc } from "../lib/access";
import { appError, forbidden, invalid } from "../lib/errors";
import { checkChoice } from "./choice";
import { offerContent } from "./content";
import {
  estimateCode,
  isFirmMember,
  offerByToken,
  requireOpen,
} from "./helpers";
import { choiceArgs } from "./validators";

// The questions a client asks on an Ofertă's link. The assistant answers
// from what the link shows; a question it can't answer, or every question
// when the firm turned it off, waits for the firm, who replies from the
// Deviz's page. See docs/adr/0019.

export const MAX_QUESTION = 1000;
const MAX_REPLY = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Questions a link takes in a day, and that the assistant answers for a firm
// in a day, so a prank or a loop can't run up the bill. Over the firm's
// limit, questions go to the firm until the next day.
export const QUESTIONS_PER_LINK = 20;
export const QUESTIONS_PER_FIRM = 200;

// The answer gets two minutes; a question still unanswered after five goes
// to the firm, and the job's own watchdog fails it.
const ANSWER_TIMEOUT_MS = 5 * 60_000;

// The earlier questions the assistant reads with a new one.
const HISTORY = 10;
const LIST_LIMIT = 100;

function checkQuestion(text: string): string {
  const question = text.trim();
  if (question.length < 2 || question.length > MAX_QUESTION) {
    throw invalid("question");
  }
  return question;
}

/**
 * Asks the firm by email, unless it already has a question of this link
 * waiting: one email until it replies.
 */
async function sendToFirm(ctx: MutationCtx, question: Doc<"offerQuestions">) {
  const recent = await ctx.db
    .query("offerQuestions")
    .withIndex("by_offerId", (q) => q.eq("offerId", question.offerId))
    .order("desc")
    .take(LIST_LIMIT);
  const waiting = recent.some(
    (other) => other._id !== question._id && other.status === "waiting",
  );
  if (!waiting) {
    await ctx.scheduler.runAfter(0, internal.offers.notify.question, {
      questionId: question._id,
    });
  }
}

/**
 * The client asks about the Ofertă as they see it: the choice on screen
 * comes along, so the answer talks about their prices. One question at a
 * time, and only while the link is open.
 */
export const ask = mutation({
  args: { token: v.string(), question: v.string(), ...choiceArgs },
  returns: v.id("offerQuestions"),
  handler: async (ctx, args) => {
    const { offer } = await requireOpen(ctx, args.token);
    if (await isFirmMember(ctx, offer.organizationId)) {
      throw forbidden("preview");
    }
    const text = checkQuestion(args.question);
    const choice = checkChoice(offer, args);
    const now = Date.now();
    const today = await ctx.db
      .query("offerQuestions")
      .withIndex("by_offerId", (q) =>
        q.eq("offerId", offer._id).gt("_creationTime", now - DAY_MS),
      )
      .take(QUESTIONS_PER_LINK);
    if (today.some((question) => question.status === "answering")) {
      throw appError("in_use", "question");
    }
    if (today.length >= QUESTIONS_PER_LINK) {
      throw appError("rate_limited", "questions");
    }
    const firmToday = await ctx.db
      .query("offerQuestions")
      .withIndex("by_organizationId", (q) =>
        q
          .eq("organizationId", offer.organizationId)
          .gt("_creationTime", now - DAY_MS),
      )
      .take(QUESTIONS_PER_FIRM);
    const assistant = offer.assistant && firmToday.length < QUESTIONS_PER_FIRM;

    const questionId = await ctx.db.insert("offerQuestions", {
      organizationId: offer.organizationId,
      estimateId: offer.estimateId,
      offerId: offer._id,
      question: text,
      choice,
      status: assistant ? "answering" : "waiting",
    });
    if (assistant) {
      const aiJobId = await createJob(
        ctx,
        {
          kind: "offer_question",
          model: aiModel(),
          organizationId: offer.organizationId,
        },
        ANSWER_TIMEOUT_MS,
      );
      await ctx.db.patch("offerQuestions", questionId, { aiJobId });
      await ctx.scheduler.runAfter(0, internal.offers.assistant.answer, {
        questionId,
      });
      await ctx.scheduler.runAfter(
        ANSWER_TIMEOUT_MS,
        internal.offers.questions.giveUp,
        { questionId },
      );
    } else {
      const question = await ctx.db.get("offerQuestions", questionId);
      if (question) {
        await sendToFirm(ctx, question);
      }
    }
    return questionId;
  },
});

/** A question as the client's page shows it, oldest first. */
function forClient(question: Doc<"offerQuestions">) {
  return {
    _id: question._id,
    _creationTime: question._creationTime,
    question: question.question,
    status: question.status,
    answer: question.answer,
    answeredAt: question.answeredAt,
    reply: question.reply,
    repliedAt: question.repliedAt,
  };
}

async function latestQuestions(ctx: QueryCtx, offerId: Id<"offers">) {
  const latest = await ctx.db
    .query("offerQuestions")
    .withIndex("by_offerId", (q) => q.eq("offerId", offerId))
    .order("desc")
    .take(LIST_LIMIT);
  return latest.reverse();
}

/**
 * The questions and answers on a link, for its page. A closed link shows
 * none: its page says only whom to ask.
 */
export const forLink = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const offer = await offerByToken(ctx, args.token);
    if (
      !offer ||
      offer.replacedBy !== undefined ||
      offer.status === "draft" ||
      offer.status === "withdrawn" ||
      offer.status === "expired"
    ) {
      return [];
    }
    return (await latestQuestions(ctx, offer._id)).map(forClient);
  },
});

/** What the client asked on a link and what they were told, for the firm. */
export const forOffer = query({
  args: { offerId: v.id("offers") },
  handler: async (ctx, args) => {
    const { doc: offer } = await requireFirmDoc(ctx, "offers", args.offerId);
    const questions = await latestQuestions(ctx, offer._id);
    const names = new Map<Id<"users">, string | null>();
    for (const question of questions) {
      if (question.repliedBy && !names.has(question.repliedBy)) {
        const user = await ctx.db.get("users", question.repliedBy);
        names.set(question.repliedBy, user?.username || user?.name || null);
      }
    }
    return questions.map((question) => ({
      ...forClient(question),
      repliedByName: question.repliedBy
        ? (names.get(question.repliedBy) ?? null)
        : null,
    }));
  },
});

/**
 * The firm answers a question on the client's page: one the assistant left
 * to it, or one it wants to say more about.
 */
export const reply = mutation({
  args: { questionId: v.id("offerQuestions"), reply: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: question, userId } = await requireFirmDoc(
      ctx,
      "offerQuestions",
      args.questionId,
    );
    const reply = args.reply.trim();
    if (!reply || reply.length > MAX_REPLY) {
      throw invalid("reply");
    }
    await ctx.db.patch("offerQuestions", question._id, {
      status: "answered",
      reply,
      repliedBy: userId,
      repliedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Starts the assistant's job and hands it the question with what it may
 * read: the Ofertă as the link shows it for the client's choice, and the
 * earlier questions with their answers. Null when there is nothing to do.
 */
export const begin = internalMutation({
  args: { questionId: v.id("offerQuestions") },
  handler: async (ctx, args) => {
    const question = await ctx.db.get("offerQuestions", args.questionId);
    if (question?.status !== "answering" || !question.aiJobId) {
      return null;
    }
    const job = await startJob(ctx, question.aiJobId);
    if (!job) {
      return null;
    }
    const offer = await ctx.db.get("offers", question.offerId);
    const estimate = offer
      ? await ctx.db.get("estimates", offer.estimateId)
      : null;
    const firm = offer
      ? await ctx.db.get("organizations", offer.organizationId)
      : null;
    if (!offer || !estimate || !firm) {
      await failJob(ctx, job, "not_found");
      await ctx.db.patch("offerQuestions", question._id, {
        status: "waiting",
      });
      return null;
    }
    const content = await offerContent(ctx, offer, estimate, question.choice);
    const earlier = await ctx.db
      .query("offerQuestions")
      .withIndex("by_offerId", (q) =>
        q.eq("offerId", offer._id).lt("_creationTime", question._creationTime),
      )
      .order("desc")
      .take(HISTORY);
    return {
      model: job.model ?? aiModel(),
      question: question.question,
      offer: {
        ...content,
        code: estimateCode(estimate),
        title: estimate.title,
        firm: { name: firm.name, phone: firm.phone, email: firm.email },
      },
      history: earlier.reverse().map((turn) => ({
        question: turn.question,
        answer: turn.answer,
        reply: turn.reply,
      })),
    };
  },
});

/**
 * Saves the assistant's answer. One that leaves the question to the firm
 * shows too, and the firm is asked. An answer that comes after the firm
 * replied, or after the question went to the firm, is dropped.
 */
export const saveAnswer = internalMutation({
  args: {
    questionId: v.id("offerQuestions"),
    answer: v.string(),
    forFirm: v.boolean(),
    usage: aiUsage,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const question = await ctx.db.get("offerQuestions", args.questionId);
    if (!question?.aiJobId) {
      return null;
    }
    const job = await ctx.db.get("aiJobs", question.aiJobId);
    if (job?.status === "running") {
      await finishJob(ctx, job._id, {
        status: "succeeded",
        usage: args.usage,
      });
    }
    if (question.status !== "answering") {
      return null;
    }
    const forFirm = args.forFirm || !args.answer;
    await ctx.db.patch("offerQuestions", question._id, {
      status: forFirm ? "waiting" : "answered",
      answer: args.answer || undefined,
      answeredAt: Date.now(),
    });
    if (forFirm) {
      await sendToFirm(ctx, question);
    }
    return null;
  },
});

/** The assistant failed: the question goes to the firm. */
export const failAnswer = internalMutation({
  args: {
    questionId: v.id("offerQuestions"),
    error: v.string(),
    usage: aiUsage,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const question = await ctx.db.get("offerQuestions", args.questionId);
    if (!question) {
      return null;
    }
    const job = question.aiJobId
      ? await ctx.db.get("aiJobs", question.aiJobId)
      : null;
    if (job && (job.status === "queued" || job.status === "running")) {
      await failJob(ctx, job, args.error, args.usage);
    }
    if (question.status === "answering") {
      await ctx.db.patch("offerQuestions", question._id, {
        status: "waiting",
      });
      await sendToFirm(ctx, question);
    }
    return null;
  },
});

/** A question the assistant didn't answer in time goes to the firm. */
export const giveUp = internalMutation({
  args: { questionId: v.id("offerQuestions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const question = await ctx.db.get("offerQuestions", args.questionId);
    if (question?.status === "answering") {
      await ctx.db.patch("offerQuestions", question._id, {
        status: "waiting",
      });
      await sendToFirm(ctx, question);
    }
    return null;
  },
});
