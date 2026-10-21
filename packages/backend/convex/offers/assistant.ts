"use node";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  claudeClient,
  errorCode,
  structuredOutput,
  UsageMeter,
} from "../ai/claude";
import {
  answerSchema,
  assistantSystemPrompt,
  cleanAnswer,
  conversationText,
  offerContext,
} from "./prompt";

// The client waits for the answer on the page, so it gets two minutes.
const ANSWER_MS = 2 * 60_000;

/**
 * Answers a client's question from the Ofertă as their link shows it. The
 * Ofertă comes first and is cached, since a client often asks several
 * questions in a row; the earlier questions and the new one follow it. A
 * failure sends the question to the firm.
 */
export const answer = internalAction({
  args: { questionId: v.id("offerQuestions") },
  returns: v.null(),
  handler: async (ctx, { questionId }) => {
    const state = await ctx.runMutation(internal.offers.questions.begin, {
      questionId,
    });
    if (!state) {
      return null;
    }
    const meter = new UsageMeter();
    try {
      const client = claudeClient();
      const output = await structuredOutput(
        client,
        {
          model: state.model,
          max_tokens: 16_000,
          system: assistantSystemPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: offerContext(state.offer),
                  cache_control: { type: "ephemeral" },
                },
                {
                  type: "text",
                  text: conversationText(
                    state.offer.firm.name,
                    state.history,
                    state.question,
                  ),
                },
              ],
            },
          ],
        },
        {
          format: zodOutputFormat(answerSchema),
          effort: "medium",
          deadline: Date.now() + ANSWER_MS,
          meter,
        },
      );
      await ctx.runMutation(internal.offers.questions.saveAnswer, {
        questionId,
        answer: cleanAnswer(output.answer),
        forFirm: output.forFirm,
        usage: meter.take(),
      });
    } catch (error) {
      await ctx.runMutation(internal.offers.questions.failAnswer, {
        questionId,
        error: errorCode(error),
        usage: meter.take(),
      });
    }
    return null;
  },
});
