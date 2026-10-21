"use client";

import type { Store } from "@devize/backend/convex/prices/resolve";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { Pencil } from "lucide-react";
import {
  formatCount,
  formatInputNumber,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { ListRow, ShoppingList } from "./types";

const headClass = "pb-2 pl-3 text-right text-label uppercase text-ink-3";

/**
 * The Lista de cumpărături: each material of the whole Deviz, in the whole
 * packages to buy, with what is left over and what that costs. The package
 * comes from the firm, the store product it chose, the producer or what the
 * material is usually sold in; the firm sets its own from here.
 */
export function ShoppingListCard({
  list,
  onEdit,
}: {
  list: ShoppingList;
  onEdit: (row: ListRow) => void;
}) {
  const t = useScopedI18n("materials.table");
  return (
    <Card>
      <CardHeader className="grid justify-items-start gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="m-0">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-body">
            <thead>
              <tr>
                <th className="pb-2 text-left text-label uppercase text-ink-3">
                  {t("material")}
                </th>
                <th className={headClass}>{t("need")}</th>
                <th className={headClass}>{t("buy")}</th>
                <th className={headClass}>{t("leftover")}</th>
                <th className={headClass}>{t("cost")}</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((row) => (
                <MaterialRow key={row.key} row={row} onEdit={onEdit} />
              ))}
            </tbody>
          </table>
        </div>
        {list.omitted > 0 && (
          <p className="m-0 text-meta text-ink-3">
            {t("omitted", { count: list.omitted })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MaterialRow({
  row,
  onEdit,
}: {
  row: ListRow;
  onEdit: (row: ListRow) => void;
}) {
  const t = useScopedI18n("materials.table");
  const tSources = useScopedI18n("materials.sources");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const unit = formatUnit(row.unit, locale);
  const pkg = row.package;
  const source = !pkg
    ? tSources("none")
    : pkg.source === "store"
      ? tSources("store", {
          store: pkg.store ? tStores(pkg.store as Store) : "",
        })
      : tSources(pkg.source);
  const leftover = row.purchase?.leftover ?? 0;

  return (
    <tr className="border-t border-border">
      <td className="py-2 align-top">
        <div className="grid justify-items-start">
          <span className="text-ink">{row.name}</span>
          <span className="flex items-center gap-1 text-meta">
            <span
              className={cn(
                pkg?.source === "typical" ? "text-warning" : "text-ink-3",
              )}
              title={pkg?.label}
            >
              {source}
            </span>
            {pkg?.source !== "counted" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-ink-3 [&_svg]:size-3.5"
                aria-label={t("edit", { name: row.name })}
                onClick={() => onEdit(row)}
              >
                <Pencil aria-hidden />
              </Button>
            )}
          </span>
          {row.pooled.packages > 0 && (
            <span className="text-meta text-success">
              {t("pooled", { count: row.pooled.packages })}
            </span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums">
        {formatQuantity(row.need, locale)}{" "}
        <span className="text-ink-3">{unit}</span>
      </td>
      <td className="whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums">
        <Packages row={row} />
      </td>
      <td className="whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums">
        {row.purchase && leftover > 0 ? (
          <div className="grid justify-items-end">
            <span>
              {formatQuantity(leftover, locale)}{" "}
              <span className="text-ink-3">{unit}</span>
            </span>
            {pkg?.source !== "counted" && (
              <span className="text-meta text-ink-3">
                {t("share", {
                  percent: formatPercent(
                    Math.round(row.purchase.leftoverShare * 100),
                    locale,
                  ),
                })}
              </span>
            )}
          </div>
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </td>
      <td className="whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums">
        <div className="grid justify-items-end">
          <span>{formatMoney(row.boughtCost, locale)}</span>
          {row.leftoverCost > 0 && (
            <span className="text-meta text-ink-3">
              {t("leftoverCost", {
                cost: formatMoney(row.leftoverCost, locale),
              })}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/** What to buy of a material: "15 × cutie de 1,44 mp", a line per size. */
function Packages({ row }: { row: ListRow }) {
  const t = useScopedI18n("materials.table");
  const tKinds = useScopedI18n("materials.kinds");
  const locale = useCurrentLocale();
  const unit = formatUnit(row.unit, locale);
  const { purchase } = row;
  if (!purchase || !row.package) {
    return <span className="text-ink-3">{t("bulk")}</span>;
  }
  if (row.package.source === "counted") {
    return (
      <span>
        {t("pieces", { count: formatCount(purchase.packages, locale), unit })}
      </span>
    );
  }
  const kind = tKinds(row.package.kind);
  return (
    <div className="grid justify-items-end">
      {purchase.counts.map((entry) => (
        <span key={entry.size}>
          {t("packageOf", {
            count: formatCount(entry.count, locale),
            kind,
            size: formatInputNumber(entry.size, locale),
            unit,
          })}
        </span>
      ))}
    </div>
  );
}
