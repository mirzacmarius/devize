"use node";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  AiJobError,
  claudeClient,
  errorCode,
  structuredOutput,
  UsageMeter,
} from "../ai/claude";
import type { AiUsage } from "../ai/pricing";
import {
  aiNormRequest,
  aiNormSchema,
  aiNormSystemPrompt,
  cleanAiNorm,
} from "./lib/aiNorm";

// Writing a norm is one request without documents; four minutes is plenty,
// and leaves the action time to save the draft.
const writeMs = 4 * 60_000;

/**
 * Writes a firm's Normă proprie from its description of the work: the model
 * answers with the norm, its consumptions and orientative prices, which are
 * checked and saved as the firm's draft, for the firm to read before it goes
 * into a Deviz.
 */
export const write = internalAction({
  args: { requestId: v.id("normRequests") },
  returns: v.null(),
  handler: async (ctx, { requestId }) => {
    const state = await ctx.runMutation(internal.catalog.aiNorms.begin, {
      requestId,
    });
    if (!state) {
      return null;
    }
    const started = Date.now();
    const meter = new UsageMeter();
    let usage: AiUsage | undefined;
    try {
      const output = await structuredOutput(
        claudeClient(),
        {
          model: state.model,
          max_tokens: 8_000,
          system: aiNormSystemPrompt,
          messages: [{ role: "user", content: aiNormRequest(state) }],
        },
        {
          format: zodOutputFormat(aiNormSchema),
          effort: "high",
          deadline: started + writeMs,
          meter,
        },
      );
      const draft = cleanAiNorm(output);
      if (!draft.ok) {
        throw new AiJobError(draft.error);
      }
      usage = meter.take();
      await ctx.runMutation(internal.catalog.aiNorms.save, {
        requestId,
        jobId: state.jobId,
        usage,
        draft: draft.value,
      });
    } catch (error) {
      // A save that failed recorded nothing, so its usage goes with the failure.
      await ctx.runMutation(internal.catalog.aiNorms.fail, {
        requestId,
        jobId: state.jobId,
        error: errorCode(error),
        usage: usage ?? meter.take(),
      });
    }
    return null;
  },
});
