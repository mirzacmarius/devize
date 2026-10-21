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
import { MAX_PDF_PAGES, pdfPageCount, sniff } from "../proposals/lib/input";
import {
  cleanDatasheetNorm,
  datasheetNormSchema,
  datasheetRequest,
  datasheetSystemPrompt,
} from "./lib/datasheet";

// An action runs for at most 10 minutes; reading a data sheet gets eight,
// leaving time to save the draft.
const readMs = 8 * 60_000;

/**
 * Reads a producer's technical data sheet into a draft norm: the model
 * writes the norm with the page of each figure, which is checked and saved
 * as the producer's draft, for them to correct and send for review.
 */
export const read = internalAction({
  args: { importId: v.id("datasheetImports") },
  returns: v.null(),
  handler: async (ctx, { importId }) => {
    const state = await ctx.runMutation(internal.producers.datasheets.begin, {
      importId,
    });
    if (!state) {
      return null;
    }
    const started = Date.now();
    const meter = new UsageMeter();
    let usage: AiUsage | undefined;
    try {
      const blob = await ctx.storage.get(state.storageId);
      if (!blob) {
        throw new AiJobError("not_found");
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (sniff(bytes) !== "pdf") {
        throw new AiJobError("not_pdf");
      }
      const pageCount = pdfPageCount(bytes);
      if (pageCount !== undefined && pageCount > MAX_PDF_PAGES) {
        throw new AiJobError("too_many_pages");
      }
      const output = await structuredOutput(
        claudeClient(),
        {
          model: state.model,
          max_tokens: 16_000,
          system: datasheetSystemPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: Buffer.from(bytes).toString("base64"),
                  },
                  title: state.fileName,
                },
                {
                  type: "text",
                  text: datasheetRequest({
                    producer: state.producer,
                    fileName: state.fileName,
                    work: state.work,
                  }),
                },
              ],
            },
          ],
        },
        {
          format: zodOutputFormat(datasheetNormSchema),
          effort: "high",
          deadline: started + readMs,
          meter,
        },
      );
      const draft = cleanDatasheetNorm(output, pageCount);
      if (!draft.ok) {
        throw new AiJobError(draft.error);
      }
      usage = meter.take();
      await ctx.runMutation(internal.producers.datasheets.save, {
        importId,
        jobId: state.jobId,
        usage,
        draft: draft.value,
      });
    } catch (error) {
      // A save that failed recorded nothing, so its usage goes with the failure.
      await ctx.runMutation(internal.producers.datasheets.fail, {
        importId,
        jobId: state.jobId,
        error: errorCode(error),
        usage: usage ?? meter.take(),
      });
    }
    return null;
  },
});
