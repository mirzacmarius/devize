import { resourceDocuments } from "./forms/consumption";
import { devizDocument } from "./forms/deviz";
import { f4Documents, f5Documents } from "./forms/equipment";
import { generalDocuments, objectDocuments } from "./forms/general";
import { c5Documents, f3Documents } from "./forms/quantities";
import { f1Documents, f2Documents } from "./forms/summaries";
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
  Subchapter,
  WorksData,
} from "./input";
export { defaultLabel, documentKinds, subchapters } from "./input";
export type { Block, FormDocument, Table } from "./model";
export { buildTree } from "./tree";

const builders: Record<
  DocumentKind,
  (
    data: ExportData,
    options: ExportOptions,
    kinds: ReadonlySet<DocumentKind>,
  ) => FormDocument[]
> = {
  DEVIZ: (data, options) => [devizDocument(data, options)],
  DG: generalDocuments,
  DO: objectDocuments,
  F1: f1Documents,
  F2: f2Documents,
  F3: f3Documents,
  C5: c5Documents,
  F4: f4Documents,
  F5: f5Documents,
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
    .flatMap((kind) => builders[kind](data, options, wanted));
}
