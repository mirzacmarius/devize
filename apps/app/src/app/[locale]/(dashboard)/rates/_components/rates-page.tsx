"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { PageHeader } from "@devize/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { formatMoney, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { MarkupsCard } from "./markups-card";
import { RateDialog } from "./rate-dialog";

export type Rate = Doc<"companyRates">;
const kinds = ["labor", "equipment", "transport"] as const;

export function RatesPage() {
  const t = useScopedI18n("rates");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const rates = useQuery(api.accounts.rates.list, { organizationId: firm._id });
  const remove = useMutation(api.accounts.rates.remove);
  const run = useRun();
  const canEdit = firm.role !== "member";
  const [dialog, setDialog] = useState<{ open: boolean; rate: Rate | null }>({
    open: false,
    rate: null,
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canEdit && (
            <Button onClick={() => setDialog({ open: true, rate: null })}>
              <Plus aria-hidden />
              {t("new")}
            </Button>
          )
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
        <Card>
          <CardHeader className="grid justify-stretch gap-1">
            <CardTitle>{t("ratesTitle")}</CardTitle>
            <CardDescription>{t("ratesDescription")}</CardDescription>
          </CardHeader>
          <TickRule />
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.rate")}</TableHead>
                  <TableHead>{t("columns.unit")}</TableHead>
                  <TableHead className="text-right">
                    {t("columns.price")}
                  </TableHead>
                  {canEdit && (
                    <TableHead className="w-20">
                      <span className="sr-only">{tc("actions")}</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {kinds.map((kind) => {
                  const ofKind = (rates ?? [])
                    .filter((rate) => rate.kind === kind)
                    .sort(
                      (a, b) =>
                        Number(a.resourceId !== undefined) -
                          Number(b.resourceId !== undefined) ||
                        a.name.localeCompare(b.name, locale),
                    );
                  return (
                    <Fragment key={kind}>
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={canEdit ? 4 : 3}
                          className="h-auto pb-1 pt-5 text-label uppercase text-ink-3"
                        >
                          {t(`kinds.${kind}`)}
                        </TableCell>
                      </TableRow>
                      {rates !== undefined && ofKind.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={canEdit ? 4 : 3}
                            className="text-ink-3"
                          >
                            {t("noRates")}
                          </TableCell>
                        </TableRow>
                      )}
                      {ofKind.map((rate) => (
                        <TableRow key={rate._id}>
                          <TableCell>
                            <div className="grid gap-0.5">
                              <span className="text-body text-ink">
                                {rate.name}
                              </span>
                              <span className="text-meta text-ink-3">
                                {rate.resourceId
                                  ? t("forResource")
                                  : t("forAll", {
                                      unit: formatUnit(rate.unit, locale),
                                    })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatUnit(rate.unit, locale)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(rate.price, locale)}
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t("edit", { name: rate.name })}
                                  onClick={() =>
                                    setDialog({ open: true, rate })
                                  }
                                >
                                  <Pencil aria-hidden />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t("remove", { name: rate.name })}
                                  onClick={() =>
                                    run(
                                      () => remove({ rateId: rate._id }),
                                      t("removed"),
                                    )
                                  }
                                >
                                  <Trash2 aria-hidden />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <MarkupsCard canEdit={canEdit} />
      </div>
      <RateDialog
        open={dialog.open}
        rate={dialog.rate}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />
    </>
  );
}
