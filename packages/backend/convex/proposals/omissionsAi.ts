"use node";

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import {
  claudeClient,
  errorCode,
  structuredOutput,
  UsageMeter,
} from "../ai/claude";
import { matchArticles } from "./ai";
import { cleanOmissions, type OmissionArticle } from "./lib/omissions";
import { omissionsRequest, omissionsSystemPrompt } from "./lib/prompts";
import { omissionsSchema } from "./lib/schemas";

// Like a draft: the reading gets six minutes and the matching ends by nine,
// leaving time to save within the action's ten.
const readMs = 6 * 60_000;
const actionBudgetMs = 9 * 60_000;

/**
 * Runs an omissions check: the model reads the Deviz and writes the works it
 * misses, which are saved at once; then each is matched with a catalog norm
 * when one fits, and the ones the Deviz has after all are left out.
 */
export const check = internalAction({
  args: { proposalId: v.id("proposals") },
  returns: v.null(),
  handler: async (ctx, { proposalId }) => {
    const state = await ctx.runMutation(internal.proposals.omissions.begin, {
      proposalId,
    });
    if (!state) {
      return null;
    }
    const started = Date.now();
    const meter = new UsageMeter();
    let client: Anthropic;
    let articles: OmissionArticle<Id<"lineItems">>[];
    try {
      client = claudeClient();
      const tender = state.estimate.kind === "tender";
      const output = await structuredOutput(
        client,
        {
          model: state.model,
          max_tokens: 32_000,
          system: omissionsSystemPrompt,
          messages: [
            {
              role: "user",
              content: omissionsRequest({
                ...state.estimate,
                lines: state.lines,
                more: state.more,
              }),
            },
          ],
        },
        {
          format: zodOutputFormat(omissionsSchema),
          effort: "high",
          deadline: started + readMs,
          meter,
        },
      );
      const found = cleanOmissions(
        output,
        new Map(state.lines.map((line) => [line.key, line.lineItemId])),
        tender,
      );
      articles = found.articles;
      const saved = await ctx.runMutation(
        internal.proposals.omissions.saveFindings,
        {
          proposalId,
          summary: found.summary,
          remarks: found.remarks,
          questions: found.questions,
          articles: articles.map(({ searchTerms: _, ...article }) => article),
        },
      );
      if (!saved) {
        articles = [];
      }
    } catch (error) {
      await ctx.runMutation(internal.ai.jobs.fail, {
        jobId: state.jobId,
        error: errorCode(error),
        usage: meter.take(),
      });
      return null;
    }

    const { matches, matchError } =
      articles.length > 0
        ? await matchArticles(
            ctx,
            client,
            { ...state, text: state.estimate.description },
            articles,
            { deadline: started + actionBudgetMs, meter },
          )
        : { matches: [], matchError: undefined };
    await ctx.runMutation(internal.proposals.drafting.complete, {
      proposalId,
      usage: meter.take(),
      matches,
      matchError,
    });
    return null;
  },
});
