import type { api } from "@devize/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type Proposal = NonNullable<
  FunctionReturnType<typeof api.proposals.proposals.latest>
>;
export type ProposalItem = Proposal["items"][number];
export type ProposalNorm = NonNullable<ProposalItem["norm"]>;
export type ItemDetails = FunctionReturnType<
  typeof api.proposals.proposals.itemDetails
>;
export type TenderIssue = NonNullable<Proposal["progress"]>["issues"][number];
