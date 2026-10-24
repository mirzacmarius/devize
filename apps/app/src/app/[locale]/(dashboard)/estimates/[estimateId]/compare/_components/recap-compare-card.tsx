"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { estimateCode, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { type Comparison, signedMoney } from "./types";

type Key =
  | "material"
  | "labor"
  | "equipment"
  | "transport"
  | "cam"
  | "direct"
  | "indirect"
  | "profit"
  | "subtotal"
  | "vat"
  | "total";

const headClass = "pb-2 pl-3 text-right text-label uppercase text-ink-3";

/** Both revisions' Recapitulație side by side, with what each line moved. */
export function RecapCompareCard({ comparison }: { comparison: Comparison }) {
  const t = useScopedI18n("compare.recap");
  const tEstimate = useScopedI18n("estimate");
  const tMarkups = useScopedI18n("markups");
  const tResources = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const { before, after, number } = comparison;

  const rows: { key: Key; label: string; kind?: "subtotal" | "total" }[] = [
    { key: "material", label: tResources("groups.material") },
    { key: "labor", label: tResources("groups.labor") },
    { key: "equipment", label: tResources("groups.equipment") },
    { key: "transport", label: tResources("groups.transport") },
    { key: "cam", label: tMarkups("cam.label") },
    { key: "direct", label: tEstimate("recap.direct"), kind: "subtotal" },
    { key: "indirect", label: tMarkups("indirect.label") },
    { key: "profit", label: tMarkups("profit.label") },
    { key: "subtotal", label: tEstimate("recap.subtotal"), kind: "subtotal" },
    { key: "vat", label: tMarkups("vat.label") },
    { key: "total", label: tEstimate("recap.total"), kind: "total" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-body">
            <caption className="sr-only">{t("caption")}</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="pb-2 text-left text-label uppercase text-ink-3"
                >
                  {t("item")}
                </th>
                <th scope="col" className={cn(headClass, "font-mono")}>
                  {estimateCode(number, before.revision)}
                </th>
                <th scope="col" className={cn(headClass, "font-mono")}>
                  {estimateCode(number, after.revision)}
                </th>
                <th scope="col" className={headClass}>
                  {t("difference")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const then = before.totals[row.key];
                const now = after.totals[row.key];
                const moved = Math.round((now - then) * 100) !== 0;
                return (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-t border-border",
                      row.kind === "total" && "border-ink",
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(
                        "py-2 pr-3 text-left font-normal",
                        row.kind ? "font-medium text-ink" : "text-ink-2",
                      )}
                    >
                      {row.label}
                    </th>
                    <td className="py-2 pl-3 text-right tabular-nums text-ink-2">
                      {formatMoney(then, locale)}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums text-ink">
                      {formatMoney(now, locale)}
                    </td>
                    <td
                      className={cn(
                        "py-2 pl-3 text-right tabular-nums",
                        moved ? "text-ink" : "text-ink-3",
                        row.kind && "font-medium",
                      )}
                    >
                      {signedMoney(now - then, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="m-0 text-meta text-ink-3">
          {tEstimate("recap.currency")}
        </p>
      </CardContent>
    </Card>
  );
}
