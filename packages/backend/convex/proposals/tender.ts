"use node";

import { inflateRawSync } from "node:zlib";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { FunctionReturnType } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";
import {
  AiJobError,
  claudeClient,
  errorCode,
  structuredOutput,
  UsageMeter,
} from "../ai/claude";
import {
  MAX_PDF_PAGES,
  type PhotoType,
  pdfPageCount,
  sniff,
} from "./lib/input";
import {
  keyArticles,
  type NormCandidate,
  resolveTenderMatches,
  type TenderMatchResult,
} from "./lib/match";
import {
  pagesRequest,
  sheetRequest,
  tenderMatchRequest,
  tenderMatchSystemPrompt,
  tenderReadSystemPrompt,
} from "./lib/prompts";
import {
  nextFile,
  nextSheet,
  type Progress,
  pageRanges,
  type Step,
  searchTerms,
  settle,
  sheetBatches,
  withIssue,
} from "./lib/reading";
import {
  type PagesOutput,
  pagesSchema,
  sheetSchema,
  tenderMatchSchema,
} from "./lib/schemas";
import {
  columnsFrom,
  type Headings,
  type ReadPosition,
  readPages,
  readRows,
} from "./lib/tender";
import { readWorkbook, type Sheet, SpreadsheetError } from "./lib/xlsx";

// An action runs for at most 10 minutes. An import starts no new step after
// four and continues in a new action; every request ends by the ninth.
const sliceMs = 4 * 60_000;
const actionBudgetMs = 9 * 60_000;

// The rows shown around a batch of a spreadsheet's rows: the top of the
// sheet with its header, a few already read and the next ones.
const topRows = 15;
const rowsBefore = 5;
const rowsAfter = 20;
// Requests sent at once, after a file's first one.
const parallel = 4;
// Positions per matching request.
const matchBatch = 20;

type Run = {
  ctx: ActionCtx;
  client: Anthropic;
  model: string;
  started: number;
  meter: UsageMeter;
};

type File = { storageId: Id<"_storage">; name: string; contentType?: string };

function deadline(run: Run) {
  return run.started + actionBudgetMs;
}

/** A request the API refused for the file itself, such as a broken PDF. */
function isFileRefused(error: unknown) {
  return (
    error instanceof Anthropic.BadRequestError &&
    !/credit balance/i.test(error.message)
  );
}

/** The files of the import, each downloaded once per action. */
class Files {
  private bytes = new Map<number, Promise<Uint8Array | null>>();
  private workbooks = new Map<number, Sheet[]>();

  constructor(
    private ctx: ActionCtx,
    private files: (File | null)[],
  ) {}

  get(index: number): File | null | undefined {
    return this.files[index];
  }

  read(index: number): Promise<Uint8Array | null> {
    let found = this.bytes.get(index);
    if (!found) {
      const file = this.files[index];
      found = file
        ? this.ctx.storage
            .get(file.storageId)
            .then(async (blob) =>
              blob ? new Uint8Array(await blob.arrayBuffer()) : null,
            )
        : Promise.resolve(null);
      this.bytes.set(index, found);
    }
    return found;
  }

  sheets(index: number, bytes: Uint8Array): Sheet[] {
    let sheets = this.workbooks.get(index);
    if (!sheets) {
      sheets = readWorkbook(bytes, (data, maxBytes) =>
        inflateRawSync(data, { maxOutputLength: maxBytes }),
      );
      this.workbooks.set(index, sheets);
    }
    return sheets;
  }
}

/** Reads up to `parallel` batches of a spreadsheet's rows. */
async function readSheetStep(
  run: Run,
  file: File,
  sheets: Sheet[],
  progress: Progress,
): Promise<Step> {
  const sheet = sheets[progress.sheet];
  if (!sheet) {
    return { positions: [], progress: nextFile(progress) };
  }
  // The sheet's first batch finds its columns; then several go at once.
  const batches = sheetBatches(
    sheet.rows,
    progress.next,
    progress.columns ? parallel : 1,
  );
  const start = batches[0]?.from;
  if (start === undefined) {
    return { positions: [], progress: nextSheet(progress) };
  }
  const outputs = await Promise.all(
    batches.map(({ from, to }) =>
      structuredOutput(
        run.client,
        {
          model: run.model,
          max_tokens: 32_000,
          system: tenderReadSystemPrompt,
          messages: [
            {
              role: "user",
              content: sheetRequest({
                fileName: file.name,
                sheetName: sheet.name,
                columns: progress.columns,
                headings: from === start ? progress : {},
                top: from > topRows ? sheet.rows.slice(0, topRows) : [],
                before: sheet.rows.slice(
                  Math.max(from > topRows ? topRows : 0, from - rowsBefore),
                  from,
                ),
                rows: sheet.rows.slice(from, to + 1),
                after: sheet.rows.slice(to + 1, to + 1 + rowsAfter),
              }),
            },
          ],
        },
        {
          format: zodOutputFormat(sheetSchema),
          effort: "medium",
          deadline: deadline(run),
          meter: run.meter,
        },
      ),
    ),
  );

  const columns =
    progress.columns ??
    (outputs[0] ? columnsFrom(outputs[0].columns) : undefined) ??
    {};
  let headings: Headings = {
    object: progress.object,
    chapter: progress.chapter,
  };
  let through = progress.next - 1;
  const positions: ReadPosition[] = [];
  batches.forEach(({ from, to }, index) => {
    const output = outputs[index];
    const last = sheet.rows[to]?.row ?? 0;
    if (!output) {
      return;
    }
    const result = readRows({
      rows: sheet.rows,
      columns,
      entries: output.entries,
      first: sheet.rows[from]?.row ?? 0,
      last,
      shown:
        sheet.rows[Math.min(to + rowsAfter, sheet.rows.length - 1)]?.row ??
        last,
      through,
      headings,
    });
    positions.push(...result.positions);
    headings = result.headings;
    through = Math.max(result.through, last);
  });
  // A sheet whose first rows show no list, such as a summary, is skipped.
  if (!progress.columns && !columns.text && positions.length === 0) {
    return { positions, progress: nextSheet(progress) };
  }
  return {
    positions,
    progress: {
      ...progress,
      next: through + 1,
      columns,
      object: headings.object,
      chapter: headings.chapter,
    },
  };
}

/** Reads one range of pages, page by page when the answer runs too long. */
async function readPageRange(
  run: Run,
  content: Anthropic.ContentBlockParam,
  file: File,
  range: { from: number; to: number },
  context: { headings: Headings; previous?: ReadPosition; image: boolean },
): Promise<PagesOutput> {
  try {
    const output = await structuredOutput(
      run.client,
      {
        model: run.model,
        max_tokens: 32_000,
        system: tenderReadSystemPrompt,
        messages: [
          {
            role: "user",
            content: [
              content,
              {
                type: "text",
                text: pagesRequest({
                  fileName: file.name,
                  ...range,
                  ...context,
                }),
              },
            ],
          },
        ],
      },
      {
        format: zodOutputFormat(pagesSchema),
        effort: "medium",
        deadline: deadline(run),
        meter: run.meter,
      },
    );
    return { pageCount: output.pageCount, entries: output.entries };
  } catch (error) {
    if (
      !(error instanceof AiJobError && error.code === "max_tokens") ||
      range.from === range.to
    ) {
      throw error;
    }
    const entries = [];
    let pageCount = 0;
    for (let page = range.from; page <= range.to; page++) {
      const output = await readPageRange(
        run,
        content,
        file,
        { from: page, to: page },
        { headings: {}, image: context.image },
      );
      entries.push(...output.entries);
      pageCount = output.pageCount;
    }
    return { pageCount, entries };
  }
}

/** Reads up to `parallel` batches of a PDF's pages. */
async function readPdfStep(
  run: Run,
  file: File,
  bytes: Uint8Array,
  progress: Progress,
): Promise<Step> {
  const counted = progress.pages ?? pdfPageCount(bytes);
  if (counted !== undefined && counted > MAX_PDF_PAGES) {
    return {
      positions: [],
      progress: nextFile(
        withIssue(progress, { kind: "unreadable", file: file.name }),
      ),
    };
  }
  const document: Anthropic.DocumentBlockParam = {
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: Buffer.from(bytes).toString("base64"),
    },
    title: file.name,
    // Cached, so the requests after the first don't pay to read it again.
    cache_control: { type: "ephemeral" },
  };
  const first = Math.max(progress.next, 1);
  if (counted !== undefined && first > counted) {
    return { positions: [], progress: nextFile(progress) };
  }
  // The first request reads the page count and caches the document.
  const ranges = pageRanges(
    progress.next,
    counted,
    progress.next > 0 ? parallel : 1,
  );
  const outputs = await Promise.all(
    ranges.map((range, index) =>
      readPageRange(run, document, file, range, {
        headings: index === 0 ? progress : {},
        image: false,
      }),
    ),
  );
  const pages =
    counted ??
    Math.max(Math.round(outputs[0]?.pageCount ?? 0), ranges[0]?.to ?? 1);
  let headings: Headings = {
    object: progress.object,
    chapter: progress.chapter,
  };
  let previous: ReadPosition | undefined;
  const positions: ReadPosition[] = [];
  ranges.forEach((range, index) => {
    const result = readPages({
      entries: outputs[index]?.entries ?? [],
      from: range.from,
      to: range.to,
      headings,
      previous,
    });
    positions.push(...result.positions);
    headings = result.headings;
    previous = result.positions.at(-1) ?? previous;
  });
  const next = (ranges.at(-1)?.to ?? first) + 1;
  const after: Progress = {
    ...progress,
    next,
    pages,
    object: headings.object,
    chapter: headings.chapter,
  };
  return { positions, progress: next > pages ? nextFile(after) : after };
}

/** Reads a photo or scan of one page. */
async function readImageStep(
  run: Run,
  file: File,
  bytes: Uint8Array,
  type: PhotoType,
  progress: Progress,
): Promise<Step> {
  const image: Anthropic.ImageBlockParam = {
    type: "image",
    source: {
      type: "base64",
      media_type: type,
      data: Buffer.from(bytes).toString("base64"),
    },
  };
  const output = await readPageRange(
    run,
    image,
    file,
    { from: 1, to: 1 },
    { headings: progress, image: true },
  );
  const result = readPages({
    entries: output.entries,
    from: 1,
    to: 1,
    headings: progress,
  });
  return {
    positions: result.positions,
    // The next photo may be the next page of the same list.
    progress: {
      ...nextFile(progress),
      object: result.headings.object,
      chapter: result.headings.chapter,
    },
  };
}

/** One step of reading: a few batches of the current file. */
async function readStep(
  run: Run,
  files: Files,
  progress: Progress,
): Promise<Step> {
  const file = files.get(progress.file);
  if (file === undefined) {
    return { positions: [], progress: { ...progress, stage: "matching" } };
  }
  const bytes = await files.read(progress.file);
  if (!file || !bytes) {
    return {
      positions: [],
      progress: nextFile(
        withIssue(progress, { kind: "unreadable", file: file?.name ?? "" }),
      ),
    };
  }
  const unreadable = (): Step => ({
    positions: [],
    progress: nextFile(
      withIssue(progress, { kind: "unreadable", file: file.name }),
    ),
  });
  const kind = sniff(bytes);
  try {
    if (kind === "zip") {
      let sheets: Sheet[];
      try {
        sheets = files.sheets(progress.file, bytes);
      } catch (error) {
        if (error instanceof SpreadsheetError || error instanceof RangeError) {
          return unreadable();
        }
        throw error;
      }
      return await readSheetStep(run, file, sheets, progress);
    }
    if (kind === "pdf") {
      return await readPdfStep(run, file, bytes, progress);
    }
    if (kind && kind !== "ole") {
      return await readImageStep(run, file, bytes, kind, progress);
    }
    return unreadable();
  } catch (error) {
    // The API refusing a file's first request means the file, not the
    // import, is the problem.
    if (progress.next === 0 && isFileRefused(error)) {
      return unreadable();
    }
    throw error;
  }
}

/** Matches up to `parallel` batches of positions with norms. */
async function matchStep(
  run: Run,
  organizationId: Id<"organizations">,
  items: FunctionReturnType<typeof internal.proposals.importing.toMatch>,
) {
  const batches = [];
  for (let index = 0; index < items.length; index += matchBatch) {
    batches.push(items.slice(index, index + matchBatch));
  }
  const settled = await Promise.allSettled(
    batches.map(
      async (
        batch,
      ): Promise<(TenderMatchResult & { candidateIds: Id<"norms">[] })[]> => {
        const found = await run.ctx.runQuery(
          internal.proposals.drafting.candidates,
          {
            organizationId,
            articles: batch.map((item) => ({
              position: item.position,
              terms: searchTerms(item),
            })),
          },
        );
        const normsAt = new Map<number, NormCandidate[]>(
          found.map((row) => [row.position, row.norms]),
        );
        const keyed = keyArticles(
          batch.map((item) => ({
            position: item.position,
            chapter: item.chapter,
            title: item.text,
            unit: item.unit,
            measured: item.measured,
            candidates: normsAt.get(item.position) ?? [],
            tenderPosition: item.tenderPosition,
            tenderCode: item.tenderCode,
            object: item.object,
          })),
          { all: true },
        );
        const output = await structuredOutput(
          run.client,
          {
            model: run.model,
            max_tokens: 32_000,
            system: tenderMatchSystemPrompt,
            messages: [{ role: "user", content: tenderMatchRequest(keyed) }],
          },
          {
            format: zodOutputFormat(tenderMatchSchema),
            effort: "medium",
            deadline: deadline(run),
            meter: run.meter,
          },
        );
        return resolveTenderMatches(keyed, output).map((match) => ({
          ...match,
          candidateIds: (normsAt.get(match.position) ?? []).map(
            (norm) => norm._id,
          ),
        }));
      },
    ),
  );
  const matches = [];
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
 * Imports a tender's quantity lists: reads the files a few batches at a
 * time, saving the positions as they are read, then matches them with
 * catalog norms, writing a recipe for the ones no norm fits. Continues in a
 * new action when a slice of time runs out.
 */
export const importTender = internalAction({
  args: { proposalId: v.id("proposals"), resume: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { proposalId, resume }) => {
    const state = await ctx.runMutation(internal.proposals.importing.begin, {
      proposalId,
      resume: resume ?? false,
    });
    if (!state) {
      return null;
    }
    const meter = new UsageMeter();
    const started = Date.now();
    const finish = async () => {
      await ctx.runMutation(internal.proposals.importing.complete, {
        proposalId,
        usage: meter.take(),
      });
    };
    const later = async () => {
      await ctx.runMutation(internal.ai.jobs.recordUsage, {
        jobId: state.jobId,
        usage: meter.take(),
      });
      await ctx.scheduler.runAfter(0, internal.proposals.tender.importTender, {
        proposalId,
        resume: true,
      });
    };
    let progress = state.progress;
    try {
      const run: Run = {
        ctx,
        client: claudeClient(),
        model: state.model,
        started,
        meter,
      };
      const files = new Files(ctx, state.files);
      while (progress.stage === "reading") {
        if (Date.now() - started > sliceMs) {
          await later();
          return null;
        }
        const fileName = files.get(progress.file)?.name ?? "";
        const step = settle(
          await readStep(run, files, progress),
          fileName,
          progress.read,
        );
        const saved = await ctx.runMutation(
          internal.proposals.importing.saveRead,
          { proposalId, positions: step.positions, progress: step.progress },
        );
        if (!saved) {
          await finish();
          return null;
        }
        progress = {
          ...step.progress,
          read: progress.read + step.positions.length,
        };
      }
      for (;;) {
        if (Date.now() - started > sliceMs) {
          await later();
          return null;
        }
        const items = await ctx.runQuery(internal.proposals.importing.toMatch, {
          proposalId,
          after: progress.matched,
          limit: matchBatch * parallel,
        });
        const last = items.at(-1);
        if (!last) {
          break;
        }
        const { matches, matchError } = await matchStep(
          run,
          state.organizationId,
          items,
        );
        const saved = await ctx.runMutation(
          internal.proposals.importing.saveMatches,
          {
            proposalId,
            matches: matches.map((match) => ({
              position: match.position,
              normId: match.normId,
              candidateIds: match.candidateIds,
              quantity: match.quantity,
              matchNote: match.matchNote,
              confidence: match.confidence,
              resources: match.resources,
            })),
            matched: last.position + 1,
            matchError,
          },
        );
        if (!saved) {
          break;
        }
        progress = { ...progress, matched: last.position + 1 };
      }
      await finish();
    } catch (error) {
      await ctx.runMutation(internal.ai.jobs.fail, {
        jobId: state.jobId,
        error: errorCode(error),
        usage: meter.take(),
      });
    }
    return null;
  },
});
