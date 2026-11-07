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
import { Pencil } from "lucide-react";
import { Nil } from "@/components/nil";
import {
  formatCount,
  formatInputNumber,
  formatMoney,
  formatPercent,
  formatQuantityRounded,
  formatUnit,
  keepUnits,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { ListRow, ShoppingList } from "./types";

// Over the number, not over the unit in its own slot after it.
const UNIT_SLOT = "ml-2 inline-block w-7 text-left text-ink-3";
// What's needed and what's left have columns from a tablet up, and a line under
// the material on a phone.
const ROOMY_HEAD = "hidden pr-[48px] text-right md:table-cell";
const ROOMY_NUMBER =
  "hidden whitespace-nowrap text-right align-top tabular-nums md:table-cell";

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
        <Table stack twoLine>
          <TableHeader>
            <TableRow>
              <TableHead>{t("material")}</TableHead>
              <TableHead className={ROOMY_HEAD}>{t("need")}</TableHead>
              <TableHead className="pl-8">{t("buy")}</TableHead>
              <TableHead className={ROOMY_HEAD}>{t("leftover")}</TableHead>
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
    ? null
    : pkg.source === "store"
      ? pkg.store
        ? tStores(pkg.store as Store)
        : tSources("storeUnknown")
      : tSources(pkg.source);
  const leftover = row.purchase?.leftover ?? 0;

  return (
    <TableRow className="group/row">
      <TableCell data-stack="wide" className="align-top">
        <div className="grid justify-items-start gap-0.5">
          <span className="text-ink">{keepUnits(row.name)}</span>
          <span className="flex min-h-[18px] items-center gap-1 text-meta">
            <span className="text-ink-3" title={pkg?.label}>
              {source ?? tSources("none")}
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
          <span className="text-meta tabular-nums text-ink-3 md:hidden">
            {t("need")} {formatQuantityRounded(row.need, locale)} {unit}
            {row.purchase &&
              leftover > 0 &&
              ` · ${t("leftover")} ${formatQuantityRounded(leftover, locale)} ${unit}`}
          </span>
        </div>
      </TableCell>
      <TableCell className={ROOMY_NUMBER}>
        {formatQuantityRounded(row.need, locale)}
        <span className={UNIT_SLOT}>{unit}</span>
      </TableCell>
      <TableCell className="whitespace-nowrap pl-8 align-top tabular-nums max-md:self-start max-md:whitespace-normal">
        <Packages row={row} />
      </TableCell>
      <TableCell className={ROOMY_NUMBER}>
        {row.purchase && leftover > 0 ? (
          <div className="grid justify-items-end gap-0.5">
            <span>
              {formatQuantityRounded(leftover, locale)}
              <span className={UNIT_SLOT}>{unit}</span>
            </span>
            {pkg?.source !== "counted" && (
              <span className="pr-[36px] text-meta text-ink-3">
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
          <>
            <Nil />
            <span className={UNIT_SLOT} />
          </>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right align-top tabular-nums max-md:self-start">
        <div className="grid justify-items-end gap-0.5">
          <span>{formatMoney(row.boughtCost, locale)}</span>
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
    return <span className="text-ink-2">{t("bulk")}</span>;
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
    <div className="grid">
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
