import type {
  AttachmentRow,
  StatementRow,
} from "@devize/backend/convex/progress/arithmetic";
import type { Markups, PartyInput } from "../input";

// What the documents of a Deviz under execution are made of: a Situație de
// lucrări with its rows, and a Proces-verbal de recepție. Structural types,
// so the app passes what its queries return.

export type { AttachmentRow };

export type StatementRowInput = StatementRow & {
  position: number;
  // The Obiect and Capitol the Articol sits in, as the Deviz prints them.
  group?: string;
  code: string;
  title: string;
  unit: string;
  attachment: readonly AttachmentRow[];
};

export type StatementInput = {
  number: number;
  status: "draft" | "sent" | "approved";
  // YYYY-MM-DD.
  periodStart: string;
  periodEnd: string;
  date: string;
  notes?: string;
  markups: Markups;
  // The Garanție de bună execuție kept back from it, lei without VAT.
  retention: number;
  approvedBy?: string;
  approvedAt?: number;
};

/** The Deviz the documents are about. */
export type WorksInput = {
  number: number;
  revision: number;
  title: string;
  siteAddress?: string;
  county?: string;
};

export type StatementData = {
  estimate: WorksInput;
  statement: StatementInput;
  rows: readonly StatementRowInput[];
  firm: PartyInput;
  client?: PartyInput | null;
  // The guarantee's share, when it is kept back from the statements.
  guarantee?: { percent: number; method: "retention" | "instrument" } | null;
};

export type StatementOptions = {
  // The Atașament as a document of its own, after the statement.
  attachment: boolean;
  // Today, as YYYY-MM-DD.
  date: string;
};

export type ReceptionPerson = {
  name: string;
  role:
    | "president"
    | "member"
    | "secretary"
    | "executant"
    | "designer"
    | "supervisor"
    | "invited";
  organization?: string;
};

export type ReceptionInput = {
  kind: "completion" | "final";
  number?: string;
  date: string;
  place?: string;
  contract?: { number: string; date?: string };
  permit?: {
    number: string;
    date?: string;
    issuer?: string;
    validUntil?: string;
  };
  executionStart?: string;
  executionEnd?: string;
  committeeStart?: string;
  committeeEnd?: string;
  warrantyMonths?: number;
  people: readonly ReceptionPerson[];
  findings?: string;
  objections: readonly { text: string; deadline?: string }[];
  decision?: "admitted" | "postponed" | "rejected";
  reasons?: string;
  measures?: string;
  copies?: number;
};

export type ReceptionData = {
  estimate: WorksInput;
  reception: ReceptionInput;
  firm: PartyInput;
  client?: PartyInput | null;
  // The approved works, lei without VAT, and the VAT rate on them.
  value: number;
  vatRate: number;
  // For the final reception: the PV at the end of the works it follows.
  completion?: { number?: string; date: string } | null;
};
