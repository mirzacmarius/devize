"use client";

import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { CardTitle } from "@devize/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useState } from "react";
import { formatCalendarDate } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { StatementDialog } from "./statement-dialog";
import type { ListedStatement, Overview } from "./types";

/** The open Situație's title, and the way to the others once there are more. */
export function StatementPicker({
  statements,
  selected,
  onSelect,
}: {
  statements: ListedStatement[];
  selected: Id<"workStatements">;
  onSelect: (statementId: Id<"workStatements">) => void;
}) {
  const t = useScopedI18n("progress.list");
  const tStatus = useScopedI18n("progress.status");
  const locale = useCurrentLocale();
  const current = statements.find((statement) => statement._id === selected);
  const title = t("number", { number: current?.number ?? 1 });

  if (statements.length < 2) {
    return <CardTitle>{title}</CardTitle>;
  }

  return (
    <Select
      value={selected}
      onValueChange={(value) => onSelect(value as Id<"workStatements">)}
    >
      <SelectTrigger
        aria-label={t("pick")}
        // A title that opens, so it starts where the card's other titles do.
        className="-ml-2 h-8 w-auto gap-1.5 border-transparent bg-transparent px-2 text-title-card hover:border-transparent hover:bg-tile"
      >
        <SelectValue>{title}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statements.map((statement) => (
          <SelectItem key={statement._id} value={statement._id}>
            {[
              t("number", { number: statement.number }),
              t("period", {
                start: formatCalendarDate(statement.periodStart, locale),
                end: formatCalendarDate(statement.periodEnd, locale),
              }),
              tStatus(statement.status),
            ].join(" · ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Starts the next Situație, from where the last one left off. */
export function NewStatementButton({
  overview,
  onCreated,
}: {
  overview: Overview;
  onCreated: (statementId: Id<"workStatements">) => void;
}) {
  const t = useScopedI18n("progress.list");
  const [creating, setCreating] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setCreating(true)}>
        {t("new")}
      </Button>
      <StatementDialog
        estimateId={overview.estimate._id}
        open={creating}
        defaultPeriodStart={overview.nextPeriodStart}
        onClose={() => setCreating(false)}
        onCreated={onCreated}
      />
    </>
  );
}
