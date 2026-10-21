import { v } from "convex/values";
import { resourceKind } from "../manufacturers/validators";

// What a proposal was made from: a description of the work, typed or
// dictated, with photos; or a Licitație's quantity lists.
export const proposalSource = v.union(
  v.literal("description"),
  v.literal("tender"),
);

// working: the AI is reading; ready: it waits for a person to review it;
// applying: the items kept are going into the Deviz, a batch at a time;
// applied: they are all in; dismissed: set aside. A proposal whose AI job
// failed stays working: its job says why.
export const proposalStatus = v.union(
  v.literal("working"),
  v.literal("ready"),
  v.literal("applying"),
  v.literal("applied"),
  v.literal("dismissed"),
);

/** One resource of an article the AI wrote itself, per unit of the article. */
export const proposedResource = v.object({
  kind: resourceKind,
  name: v.string(),
  unit: v.string(),
  quantity: v.number(),
});

/** An Obiect or a Capitol of a tender's lists, as the lists write it. */
export const tenderSection = v.object({
  code: v.optional(v.string()),
  name: v.string(),
});

/** A position of a tender's quantity list, besides its unit and quantity. */
export const tenderPosition = v.object({
  // Its number, code and full text as the list writes them.
  position: v.string(),
  code: v.optional(v.string()),
  text: v.string(),
  object: v.optional(tenderSection),
  chapter: v.optional(tenderSection),
  // Short phrasings of the work, to search the catalog with.
  terms: v.array(v.string()),
});

// The columns of a spreadsheet list, by letter, once read from its header.
export const sheetColumns = v.object({
  position: v.optional(v.string()),
  code: v.optional(v.string()),
  text: v.optional(v.string()),
  unit: v.optional(v.string()),
  quantity: v.optional(v.string()),
});

// What an import couldn't take from the lists: a file it couldn't read, an
// old .xls, positions without a quantity or a unit (by number), or the
// positions past the limit.
export const tenderIssue = v.object({
  kind: v.union(
    v.literal("unreadable"),
    v.literal("no_quantity"),
    v.literal("too_many"),
  ),
  file: v.string(),
  positions: v.optional(v.array(v.string())),
});

// How far a tender import got: the files are read in order, each a batch of
// rows or pages at a time, then the positions are matched with norms.
export const tenderProgress = v.object({
  stage: v.union(v.literal("reading"), v.literal("matching")),
  // The file being read, by its index in the proposal's files; in it, the
  // sheet (spreadsheets) and the next row or page to read.
  file: v.number(),
  sheet: v.number(),
  next: v.number(),
  columns: v.optional(sheetColumns),
  // The page count of the PDF being read, once known.
  pages: v.optional(v.number()),
  // The Obiect and Capitol the next positions go in.
  object: v.optional(tenderSection),
  chapter: v.optional(tenderSection),
  // Positions read, and matched with norms.
  read: v.number(),
  matched: v.number(),
  issues: v.array(tenderIssue),
});
