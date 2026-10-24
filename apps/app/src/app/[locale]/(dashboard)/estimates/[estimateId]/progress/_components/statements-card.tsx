"use client";

import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { StatusPill } from "@devize/ui/status-pill";
import { cn } from "@devize/ui/utils";
import { useState } from "react";
import { formatCalendarDate, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { StatementDialog } from "./statement-dialog";
import { statementTone } from "./statement-status";
import type { Overview } from "./types";

/**
 * The Deviz's Situații de lucrări, one per period, the open one last, and
 * the button that starts the next once the last is confirmed.
 */
export function StatementsCard({
  overview,
  selected,
  onSelect,
}: {
  overview: Overview;
  selected: Id<"workStatements"> | null;
  onSelect: (statementId: Id<"workStatements">) => void;
}) {
  const t = useScopedI18n("progress.list");
  const tStatus = useScopedI18n("progress.status");
  const locale = useCurrentLocale();
  const [creating, setCreating] = useState(false);
  const blocked = !overview.canCreate && overview.accepted;

  return (
    <Card>
      <CardHeader className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("title")}</CardTitle>
          {overview.accepted && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!overview.canCreate}
              onClick={() => setCreating(true)}
            >
              {t("new")}
            </Button>
          )}
        </div>
        <CardDescription className="m-0">
          {blocked && overview.statements.length > 0
            ? t("cannotCreate")
            : t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overview.statements.length === 0 ? (
          <p className="m-0 text-body text-ink-2">{t("empty")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-1 p-0">
            {overview.statements.map((statement) => {
              const active = statement._id === selected;
              return (
                <li key={statement._id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={t("select", { number: statement.number })}
                    onClick={() => onSelect(statement._id)}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-md border px-3 py-2 text-left transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "border-ring bg-sunken" : "border-border",
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-medium text-ink">
                        {t("number", { number: statement.number })}
                      </span>
                      <StatusPill tone={statementTone[statement.status]}>
                        {tStatus(statement.status)}
                      </StatusPill>
                    </span>
                    <span className="text-right text-body tabular-nums text-ink">
                      {t("subtotal", {
                        amount: formatMoney(statement.subtotal, locale),
                      })}
                    </span>
                    <span className="text-meta text-ink-3">
                      {t("period", {
                        start: formatCalendarDate(
                          statement.periodStart,
                          locale,
                        ),
                        end: formatCalendarDate(statement.periodEnd, locale),
                      })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <StatementDialog
        estimateId={overview.estimate._id}
        open={creating}
        defaultPeriodStart={overview.nextPeriodStart}
        onClose={() => setCreating(false)}
        onCreated={onSelect}
      />
    </Card>
  );
}
