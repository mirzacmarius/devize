import type { StatusPillProps } from "@devize/ui/status-pill";
import type { ListedStatement } from "./types";

/** How a statement's state reads: a draft, out with the beneficiary, confirmed. */
export const statementTone: Record<
  ListedStatement["status"],
  StatusPillProps["tone"]
> = {
  draft: "draft",
  sent: "active",
  approved: "success",
};
