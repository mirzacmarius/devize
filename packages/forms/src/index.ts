import { resourceDocuments } from "./forms/consumption";
import { devizDocument } from "./forms/deviz";
import { c5Documents, f3Documents } from "./forms/quantities";
import {
  type DocumentKind,
  documentKinds,
  type ExportData,
  type ExportOptions,
} from "./input";
import type { FormDocument } from "./model";

// A Deviz as documents: the one its client gets, and the official forms of a
// tender. Builders turn the Deviz into blocks and tables; `@devize/forms/pdf`
// draws them.

export type {
  DocumentKind,
  ExportData,
  ExportOptions,
  LineItemInput,
  PartyInput,
  ResourceScope,
  SectionInput,
} from "./input";
export { documentKinds } from "./input";
export type { Block, FormDocument, Table } from "./model";
export { buildTree } from "./tree";

const builders: Record<
  DocumentKind,
  (data: ExportData, options: ExportOptions) => FormDocument[]
> = {
  DEVIZ: (data, options) => [devizDocument(data, options)],
  F3: f3Documents,
  C5: c5Documents,
  C6: (data, options) => resourceDocuments(data, options, "material"),
  C7: (data, options) => resourceDocuments(data, options, "labor"),
  C8: (data, options) => resourceDocuments(data, options, "equipment"),
  C9: (data, options) => resourceDocuments(data, options, "transport"),
};

/** The chosen documents, in the order they print: every F3 before any C5. */
export function buildDocuments(
  data: ExportData,
  kinds: readonly DocumentKind[],
  options: ExportOptions,
): FormDocument[] {
  const wanted = new Set(kinds);
  return documentKinds
    .filter((kind) => wanted.has(kind))
    .flatMap((kind) => builders[kind](data, options));
}
