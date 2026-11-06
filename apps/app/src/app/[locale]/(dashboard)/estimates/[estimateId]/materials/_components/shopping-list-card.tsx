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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { cn } from "@devize/ui/utils";
import { Pencil } from "lucide-react";
import {
  formatCount,
  formatInputNumber,
  formatMoney,
  formatPercent,
  formatQuantityRounded,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { ListRow, ShoppingList } from "./types";

// Over the number, not over the unit in its own slot after it.
const UNIT_SLOT = "ml-1.5 inline-block w-7 text-left text-ink-3";
const HEAD_OVER_NUMBER = "pr-[46px] text-right";
const numberClass = "whitespace-nowrap text-right align-top tabular-nums";

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
        <Table bleed className="min-w-[44rem]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("material")}</TableHead>
              <TableHead className={HEAD_OVER_NUMBER}>{t("need")}</TableHead>
              <TableHead className="text-right">{t("buy")}</TableHead>
              <TableHead className={HEAD_OVER_NUMBER}>
                {t("leftover")}
              </TableHead>
              <TableHead className="text-right">{t("cost")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((row) => (
              <MaterialRow key={row.key} row={row} onEdit={onEdit} />
            ))}
          </TableBody>
        </Table>
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
    <TableRow className="group/row">
      <TableCell className="align-top">
        <div className="grid justify-items-start gap-0.5">
          <span className="text-ink">{row.name}</span>
          <span className="flex min-h-[18px] items-center gap-1 text-meta">
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
                // With a pointer it shows on the row it belongs to.
                className="-my-1.5 size-7 text-ink-3 focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:hover)]:opacity-0 [&_svg]:size-3.5"
                aria-label={t("edit", { name: row.name })}
                onClick={() => onEdit(row)}
              >
                <Pencil aria-hidden />
              </Button>
            )}
          </span>
          {row.pooled.packages > 0 && (
            <span className="text-meta text-ink-3">
              {t("pooled", { count: row.pooled.packages })}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={numberClass}>
        {formatQuantityRounded(row.need, locale)}
        <span className={UNIT_SLOT}>{unit}</span>
      </TableCell>
      <TableCell className={numberClass}>
        <Packages row={row} />
      </TableCell>
      <TableCell className={numberClass}>
        {row.purchase && leftover > 0 ? (
          <div className="grid justify-items-end gap-0.5">
            <span>
              {formatQuantityRounded(leftover, locale)}
              <span className={UNIT_SLOT}>{unit}</span>
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
          <span className="pr-[34px] text-ink-3">–</span>
        )}
      </TableCell>
      <TableCell className={numberClass}>
        <div className="grid justify-items-end gap-0.5">
          <span className="font-medium">
            {formatMoney(row.boughtCost, locale)}
          </span>
          {row.leftoverCost > 0 && (
            <span className="text-meta text-ink-3">
              {t("leftoverCost", {
                cost: formatMoney(row.leftoverCost, locale),
              })}
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
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
  // One piece at a time needs no package: "5 buc", not "5 × bucată de 1 buc".
  if (
    row.package.source === "counted" ||
    (row.package.kind === "piece" &&
      purchase.counts.every((entry) => entry.size === 1))
  ) {
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
