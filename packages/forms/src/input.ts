import type {
  Amounts,
  Markups,
  ResourceKind,
} from "@devize/backend/convex/estimates/recap";

// What the documents are made of: a Deviz as `estimates.get` returns it, its
// firm and its client. Structural types, so the app passes Convex documents
// as they are.

export type { Amounts, Markups, ResourceKind };

export type ResourceInput = {
  key: string;
  kind: ResourceKind;
  resourceId?: string;
  productId?: string;
  name: string;
  unit: string;
  // Per unit of the line item, or a share of its materials when the unit is %.
  quantity: number;
  // Lei without VAT per unit of the resource.
  unitPrice: number;
  store?: string;
};

export type TenderRef = {
  // The authority's own position number, code and text.
  position: string;
  code?: string;
  text?: string;
  // The authority's unit and quantity, when the line uses a norm's own.
  unit?: string;
  quantity?: number;
};

export type LineItemInput = {
  _id: string;
  sectionId?: string;
  position: number;
  code: string;
  title: string;
  unit: string;
  quantity: number;
  resources: ResourceInput[];
  // Lei per unit, rounded to bani for each kind of resource.
  unitCost: Amounts;
  laborHours: number;
  tenderRef?: TenderRef;
};

export type SectionInput = {
  _id: string;
  kind: "object" | "chapter";
  parentId?: string;
  code?: string;
  name: string;
  position: number;
};

export type EstimateInput = {
  number: number;
  revision: number;
  title: string;
  kind: "private" | "tender";
  // YYYY-MM-DD.
  priceDate: string;
  markups: Markups;
  siteAddress?: string;
  county?: string;
  tender?: { authority?: string; procedure?: string; deadline?: string };
};

/** A firm or a client, as the documents name them. */
export type PartyInput = {
  name: string;
  cui?: string;
  tradeRegister?: string;
  address?: string;
  county?: string;
  email?: string;
  phone?: string;
};

export type ExportData = {
  estimate: EstimateInput;
  sections: readonly SectionInput[];
  lineItems: readonly LineItemInput[];
  firm: PartyInput;
  client?: PartyInput | null;
};

/** A Deviz's works, without who builds them or for whom. */
export type WorksData = Pick<ExportData, "estimate" | "sections" | "lineItems">;

/**
 * The documents a Deviz can be exported as, in the order they print: the
 * client's Deviz, the offer form that opens a tender's financial offer, the
 * Deviz general and the objects' Devize, then the offer's other forms.
 */
export const documentKinds = [
  "DEVIZ",
  "OF",
  "DG",
  "DO",
  "F1",
  "F2",
  "F3",
  "C5",
  "F4",
  "F5",
  "F6",
  "C6",
  "C7",
  "C8",
  "C9",
] as const;

export type DocumentKind = (typeof documentKinds)[number];

/** What a document's corner and footer call it, unless the person renamed it. */
export function defaultLabel(kind: DocumentKind): string {
  switch (kind) {
    case "DEVIZ":
      return "Deviz";
    case "OF":
      return "Formularul de ofertă";
    case "DG":
      return "Devizul general";
    case "DO":
      return "Devizul obiectului";
    default:
      return `Formularul ${kind}`;
  }
}

/**
 * Where a category of works falls in the Deviz general and in its object's
 * Deviz (HG 907/2016, Anexele 7 și 8): a subchapter of chapter 4, the base
 * investment, or one of the works outside it.
 */
export const subchapters = [
  "1.2",
  "1.3",
  "1.4",
  "2",
  "4.1.1",
  "4.1.2",
  "4.1.3",
  "4.1.4",
  "4.2",
  "4.3",
  "4.4",
  "4.5",
  "4.6",
  "5.1.1",
] as const;

export type Subchapter = (typeof subchapters)[number];

/** The months a category of works runs in, from the first to the last, from 1. */
export type ScheduleWindow = { start: number; end: number };

/**
 * How the resource lists (C6–C9) group the works: one list for the whole
 * Deviz, one per object or one per category of works.
 */
export type ResourceScope = "estimate" | "object" | "category";

/** What the person chose in the export sheet. */
export type ExportOptions = {
  // The contracting authority or the client; the Deviz's own when left out.
  beneficiary?: string;
  // The firm that designed the works, when it is not the bidder.
  designer?: string;
  // Lists without prices, as a designer publishes them for a tender.
  withValues: boolean;
  // By object when left out.
  resourceScope?: ResourceScope;
  // The tender documentation's own names for the forms, since authorities
  // number them differently: "Formularul nr. 5" for F3.
  labels?: Partial<Record<DocumentKind, string>>;
  // The subchapter of each category of works, by its key, where the person
  // chose another than the one guessed from its name.
  subchapters?: Readonly<Record<string, Subchapter>>;
  // F6: how many months the works take, and the months of each category of
  // works, by its key, where the person chose other than ours.
  schedule?: {
    months?: number;
    windows?: Readonly<Record<string, ScheduleWindow>>;
  };
  // The offer form: the days the offer stays valid, as the tender asks, and
  // who signs it for the bidder.
  offer?: { validity?: number; signer?: string; role?: string };
  // Today, as YYYY-MM-DD, printed by the signatures.
  date: string;
};
