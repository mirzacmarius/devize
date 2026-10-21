import type { api } from "@devize/backend/convex/_generated/api";
import type { ExportData } from "@devize/forms";
import type { WorksData } from "@devize/forms/sheet";
import type { FunctionReturnType } from "convex/server";

export type Estimate = FunctionReturnType<typeof api.estimates.estimates.get>;
type Firm = FunctionReturnType<typeof api.accounts.organizations.get>;
type Client = FunctionReturnType<typeof api.accounts.clients.get>;

/** A Deviz's works as the documents read them. */
export function worksOf(estimate: Estimate): WorksData {
  return {
    estimate: {
      number: estimate.number,
      revision: estimate.revision,
      title: estimate.title,
      kind: estimate.kind,
      priceDate: estimate.priceDate,
      markups: estimate.markups,
      siteAddress: estimate.siteAddress,
      county: estimate.county,
      tender: estimate.tender,
    },
    sections: estimate.sections,
    lineItems: estimate.lineItems,
  };
}

/** A Deviz as the documents read it, with its firm's and client's details. */
export function exportData(
  estimate: Estimate,
  firm: Firm,
  client: Client | null,
): ExportData {
  return {
    ...worksOf(estimate),
    firm: {
      name: firm.name,
      cui: firm.cui,
      tradeRegister: firm.tradeRegister,
      address: firm.address,
      county: firm.county,
      email: firm.email,
      phone: firm.phone,
    },
    client: client
      ? {
          name: client.name,
          cui: client.cui,
          address: client.address,
          email: client.email,
          phone: client.phone,
        }
      : estimate.client && { name: estimate.client.name },
  };
}

/** A file's name: the Deviz's code and a title, without what file systems refuse. */
export function fileName(
  code: string,
  title: string,
  extension = "pdf",
): string {
  const clean = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return clean ? `${code} ${clean}.${extension}` : `${code}.${extension}`;
}
