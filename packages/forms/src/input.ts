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

/** The documents a Deviz can be exported as, in the order they print. */
export const documentKinds = [
  "DEVIZ",
  "F3",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
] as const;

export type DocumentKind = (typeof documentKinds)[number];

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
  // Today, as YYYY-MM-DD, printed by the signatures.
  date: string;
};
