"use node";

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";
import {
  claudeClient,
  errorCode,
  structuredOutput,
  UsageMeter,
} from "../ai/claude";
import { cleanDraft, type DraftArticle } from "./lib/draft";
import { isPhotoType } from "./lib/input";
import {
  keyArticles,
  type MatchArticle,
  type MatchResult,
  resolveMatches,
} from "./lib/match";
import {
  draftRequest,
  draftSystemPrompt,
  matchRequest,
  matchSystemPrompt,
} from "./lib/prompts";
import { draftSchema, matchSchema } from "./lib/schemas";

// An action runs for at most 10 minutes: the draft gets six of them and the
// matching ends by nine, leaving time to save.
const draftMs = 6 * 60_000;
const actionBudgetMs = 9 * 60_000;

// Articles per catalog search and matching request.
const matchBatchSize = 20;

type Match = MatchResult & {
  candidateIds: MatchArticle["candidates"][number]["_id"][];
};

/**
 * Matches drafted articles with catalog norms: each batch is searched and
 * matched on its own, all at once, and a batch that fails leaves its
 * articles with the model's recipes and says why in `matchError`.
 */
export async function matchArticles(
  ctx: ActionCtx,
  client: Anthropic,
  state: {
    model: string;
    organizationId: Id<"organizations">;
    // What the contractor asked for, which may name a producer.
    text?: string;
  },
  articles: readonly DraftArticle[],
  run: { deadline: number; meter: UsageMeter },
): Promise<{ matches: Match[]; matchError?: string }> {
  const batches: { article: DraftArticle; position: number }[][] = [];
  articles.forEach((article, position) => {
    if (position % matchBatchSize === 0) {
      batches.push([]);
    }
    batches.at(-1)?.push({ article, position });
  });
  const settled = await Promise.allSettled(
    batches.map(async (batch): Promise<Match[]> => {
      const found = await ctx.runQuery(internal.proposals.drafting.candidates, {
        organizationId: state.organizationId,
        articles: batch.map(({ article, position }) => ({
          position,
          terms: [...article.searchTerms, article.title],
        })),
      });
      const normsAt = new Map(found.map((row) => [row.position, row.norms]));
      const keyed = keyArticles(
        batch.map(({ article, position }) => ({
          position,
          chapter: article.chapter,
          title: article.title,
          unit: article.unit,
          measured: article.measured,
          note: article.note,
          candidates: normsAt.get(position) ?? [],
        })),
      );
      if (keyed.length === 0) {
        return [];
      }
      const output = await structuredOutput(
        client,
        {
          model: state.model,
          max_tokens: 16_000,
          system: matchSystemPrompt,
          messages: [
            { role: "user", content: matchRequest(keyed, state.text) },
          ],
        },
        {
          format: zodOutputFormat(matchSchema),
          effort: "medium",
          deadline: run.deadline,
          meter: run.meter,
        },
      );
      return resolveMatches(keyed, output).map((match) => ({
        ...match,
        candidateIds: (normsAt.get(match.position) ?? []).map(
          (norm) => norm._id,
        ),
      }));
    }),
  );
  const matches: Match[] = [];
  let matchError: string | undefined;
  for (const result of settled) {
    if (result.status === "fulfilled") {
      matches.push(...result.value);
    } else {
      matchError ??= errorCode(result.reason);
    }
  }
  return { matches, matchError };
}

/**
 * Drafts a proposal: the model reads the description and the photos and
 * writes the articles with their Antemăsurătoare and recipes, which are
 * saved at once; then each article is matched with a catalog norm when one
 * fits. A failed match leaves the articles with their own recipes.
 */
export const draft = internalAction({
  args: { proposalId: v.id("proposals") },
  returns: v.null(),
  handler: async (ctx, { proposalId }) => {
    const state = await ctx.runMutation(internal.proposals.drafting.begin, {
      proposalId,
    });
    if (!state) {
      return null;
    }
    const started = Date.now();
    const meter = new UsageMeter();
    let client: Anthropic;
    let articles: DraftArticle[];
    try {
      client = claudeClient();
      const images: Anthropic.ImageBlockParam[] = [];
      for (const photo of state.photos) {
        const blob = await ctx.storage.get(photo.storageId);
        if (blob && isPhotoType(photo.contentType)) {
          images.push({
            type: "image",
            source: {
              type: "base64",
              media_type: photo.contentType,
              data: Buffer.from(await blob.arrayBuffer()).toString("base64"),
            },
          });
        }
      }
      const output = await structuredOutput(
        client,
        {
          model: state.model,
          max_tokens: 64_000,
          system: draftSystemPrompt,
          messages: [
            {
              role: "user",
              content: [
                ...images,
                {
                  type: "text",
                  text: draftRequest({
                    ...state.estimate,
                    text: state.text,
                    photoCount: images.length,
                  }),
                },
              ],
            },
          ],
        },
        {
          format: zodOutputFormat(draftSchema),
          effort: "high",
          deadline: started + draftMs,
          meter,
        },
      );
      const draft = cleanDraft(output);
      articles = draft.articles;
      const saved = await ctx.runMutation(
        internal.proposals.drafting.saveDraft,
        {
          proposalId,
          summary: draft.summary,
          assumptions: draft.assumptions,
          questions: draft.questions,
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

    const { matches, matchError } = await matchArticles(
      ctx,
      client,
      state,
      articles,
      { deadline: started + actionBudgetMs, meter },
    );
    await ctx.runMutation(internal.proposals.drafting.complete, {
      proposalId,
      usage: meter.take(),
      matches,
      matchError,
    });
    return null;
  },
});
