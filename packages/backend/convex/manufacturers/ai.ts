"use node";

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  AiJobError,
  claudeClient,
  errorCode,
  runToolTurn,
  structuredOutput,
  UsageMeter,
} from "../ai/claude";
import { finalText, webEvidence } from "../ai/messages";
import { cleanFindings, emailsInPage } from "./lib/findings";
import { batchArticles, normsFromArticle } from "./lib/norms";
import {
  normsBatchRequest,
  normsIndexRequest,
  normsSystemPrompt,
  researchRequest,
  researchSystemPrompt,
  structureRequest,
  structureSystemPrompt,
} from "./lib/prompts";
import {
  type NormsExtractionOutput,
  normsExtractionSchema,
  normsIndexSchema,
  researchFindingsSchema,
} from "./lib/schemas";
import { urlKey } from "./lib/text";

// An action runs for at most 10 minutes. Research stops searching after six,
// to leave time to structure and save what it found; norms extraction starts
// no new batch after three and continues in a new action instead.
const researchSearchMs = 6 * 60_000;
const actionBudgetMs = 9 * 60_000;
const extractionSliceMs = 3 * 60_000;

// Variants per extraction request: enough to keep the cached PDF busy, few
// enough that the answer is never cut off.
const variantsPerBatch = 8;

const researchTools: Anthropic.ToolUnion[] = [
  {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 12,
    user_location: {
      type: "approximate",
      country: "RO",
      timezone: "Europe/Bucharest",
    },
  },
  {
    type: "web_fetch_20260209",
    name: "web_fetch",
    max_uses: 12,
    max_content_tokens: 30_000,
  },
];

/**
 * A page's HTML, to confirm an address is really on it. Only pages research
 * already saw are fetched, only over HTTP(S) and by host name.
 */
async function fetchPage(url: string): Promise<string> {
  try {
    const parsed = new URL(url);
    const isHostName =
      /[a-z]/i.test(parsed.hostname.split(".").pop() ?? "") &&
      parsed.hostname.includes(".");
    if (!["http:", "https:"].includes(parsed.protocol) || !isHostName) {
      return "";
    }
    const response = await fetch(parsed, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Devize/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/html|text/.test(type)) {
      return "";
    }
    return (await response.text()).slice(0, 2_000_000);
  } catch {
    return "";
  }
}

/**
 * Researches a manufacturer on the web, structures the findings, checks them
 * against what the research actually saw and saves them, which drafts the
 * first email. Nothing is sent.
 */
export const research = internalAction({
  args: { jobId: v.id("aiJobs") },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.runMutation(internal.manufacturers.research.begin, {
      jobId,
    });
    if (!job) {
      return null;
    }
    const started = Date.now();
    const meter = new UsageMeter();
    try {
      const client = claudeClient();
      const turn = await runToolTurn(
        client,
        {
          model: job.model,
          max_tokens: 32_000,
          system: researchSystemPrompt,
          tools: researchTools,
          messages: [
            { role: "user", content: researchRequest(job.manufacturer) },
          ],
        },
        { deadline: started + researchSearchMs, meter },
      );
      const report = finalText(turn);
      const { sources, texts } = webEvidence(turn);

      const output = await structuredOutput(
        client,
        {
          model: job.model,
          max_tokens: 16_000,
          system: structureSystemPrompt,
          messages: [
            {
              role: "user",
              content: structureRequest(job.manufacturer, report, sources),
            },
          ],
        },
        {
          format: zodOutputFormat(researchFindingsSchema),
          effort: "medium",
          deadline: started + actionBudgetMs,
          meter,
        },
      );

      // An address counts as verified once it is read on a page: in the text
      // research fetched, or on its source page, fetched again here.
      const urls = new Set(sources.map((source) => urlKey(source.url)));
      const emails = new Set(texts.flatMap(emailsInPage));
      const sourcePages = new Set<string>();
      for (const contact of output.contacts) {
        if (
          contact.email &&
          contact.sourceUrl &&
          urls.has(urlKey(contact.sourceUrl))
        ) {
          sourcePages.add(contact.sourceUrl);
        }
      }
      const pages = await Promise.all(
        [...sourcePages].slice(0, 5).map(fetchPage),
      );
      for (const email of pages.flatMap(emailsInPage)) {
        emails.add(email);
      }

      await ctx.runMutation(internal.manufacturers.research.save, {
        jobId,
        usage: meter.total,
        report: report.slice(0, 100_000),
        sources: sources.slice(0, 100),
        findings: cleanFindings(output, { urls, emails }),
      });
    } catch (error) {
      await ctx.runMutation(internal.ai.jobs.fail, {
        jobId,
        error: errorCode(error),
        usage: meter.total,
      });
    }
    return null;
  },
});

/**
 * Extracts a norms PDF: first its list of articles, then the articles a few
 * at a time, each saved for review as soon as it is read. The PDF is cached
 * between requests, so only the first one pays for reading it in full.
 */
export const extractNorms = internalAction({
  args: { jobId: v.id("aiJobs"), resume: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { jobId, resume }) => {
    const state = await ctx.runMutation(
      internal.manufacturers.normImports.begin,
      { jobId, resume: resume ?? false },
    );
    if (!state) {
      return null;
    }
    const started = Date.now();
    const meter = new UsageMeter();
    try {
      const client = claudeClient();
      const file = await ctx.storage.get(state.fileId);
      if (!file) {
        throw new AiJobError("not_found");
      }
      const pdf: Anthropic.DocumentBlockParam = {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: Buffer.from(await file.arrayBuffer()).toString("base64"),
        },
        title: state.fileName,
        cache_control: { type: "ephemeral" },
      };
      const request = (text: string) => ({
        model: state.model,
        system: normsSystemPrompt,
        messages: [
          {
            role: "user" as const,
            content: [pdf, { type: "text" as const, text }],
          },
        ],
      });
      const run = { deadline: started + actionBudgetMs, meter };

      let { articles, laborRate } = state;
      if (articles.length === 0) {
        const index = await structuredOutput(
          client,
          { ...request(normsIndexRequest), max_tokens: 16_000 },
          {
            ...run,
            format: zodOutputFormat(normsIndexSchema),
            effort: "medium",
          },
        );
        const seen = new Set<string>();
        articles = [];
        for (const article of index.articles) {
          const baseCode = article.baseCode.replace(/\s+/g, "");
          if (baseCode && !seen.has(baseCode)) {
            seen.add(baseCode);
            articles.push({
              baseCode,
              title: article.title.trim(),
              unit: article.unit.trim(),
              variantCodes: article.variantCodes
                .map((code) => code.replace(/\s+/g, ""))
                .filter(Boolean),
              pages: article.pages.filter(
                (page) => Number.isInteger(page) && page > 0,
              ),
            });
          }
        }
        if (articles.length === 0) {
          throw new AiJobError("no_articles");
        }
        laborRate = index.laborRate ?? undefined;
        await ctx.runMutation(internal.manufacturers.normImports.saveIndex, {
          normImportId: state.normImportId,
          articles,
          edition: index.edition?.trim() || undefined,
          laborRate,
        });
      }

      let done = state.articlesDone;
      let maxVariants = variantsPerBatch;
      while (done < articles.length) {
        if (Date.now() - started > extractionSliceMs) {
          await ctx.runMutation(internal.ai.jobs.recordUsage, {
            jobId,
            usage: meter.take(),
          });
          await ctx.scheduler.runAfter(
            0,
            internal.manufacturers.ai.extractNorms,
            {
              jobId,
              resume: true,
            },
          );
          return null;
        }
        const batch = batchArticles(articles.slice(done), maxVariants)[0];
        if (!batch) {
          break;
        }
        let extraction: NormsExtractionOutput;
        try {
          extraction = await structuredOutput(
            client,
            { ...request(normsBatchRequest(batch)), max_tokens: 48_000 },
            {
              ...run,
              format: zodOutputFormat(normsExtractionSchema),
              effort: "high",
            },
          );
        } catch (error) {
          // An answer cut off at the token limit: read one article at a time.
          if (
            error instanceof AiJobError &&
            error.code === "max_tokens" &&
            batch.length > 1
          ) {
            maxVariants = 1;
            continue;
          }
          throw error;
        }
        done += batch.length;
        await ctx.runMutation(internal.manufacturers.normImports.saveNorms, {
          normImportId: state.normImportId,
          norms: extraction.articles.flatMap((article) =>
            normsFromArticle(article, { laborRate }),
          ),
          articlesDone: done,
        });
      }
      await ctx.runMutation(internal.manufacturers.normImports.complete, {
        jobId,
        normImportId: state.normImportId,
        usage: meter.total,
      });
    } catch (error) {
      await ctx.runMutation(internal.ai.jobs.fail, {
        jobId,
        error: errorCode(error),
        usage: meter.take(),
      });
    }
    return null;
  },
});
