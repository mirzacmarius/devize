"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
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
import { usePaginatedQuery } from "convex/react";
import { ExternalLink } from "lucide-react";
import { useFirm } from "@/components/firm-provider";
import { formatDay, formatMoney, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { priceMove, signedPercent } from "./prices-view";

const PAGE = 20;

/**
 * The store products the firm chose, latest first: the price each store asks
 * now, what it asked before its last change, and when it was read.
 */
export function ProductsCard() {
  const t = useScopedI18n("prices.products");
  const tc = useScopedI18n("common");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const money = (value: number) => formatMoney(value, locale);
  const products = usePaginatedQuery(
    api.prices.choices.listForFirm,
    { organizationId: firm._id },
    { initialNumItems: PAGE },
  );
  const rows =
    products.status === "LoadingFirstPage" ? undefined : products.results;

  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="m-0">{t("description")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        {rows?.length === 0 ? (
          <div className="grid gap-1 rounded-md bg-tile px-4 py-3">
            <p className="m-0 text-body font-medium text-ink">
              {t("emptyTitle")}
            </p>
            <p className="m-0 text-meta text-ink-3">{t("emptyDescription")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("product")}</TableHead>
                <TableHead className="text-right">{t("price")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("change")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {t("checked")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === undefined && (
                <TableRow>
                  <TableCell colSpan={4} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((row) => {
                const { listing } = row;
                const move = row.previous
                  ? priceMove(row.previous.price, listing.price)
                  : 0;
                return (
                  <TableRow key={row._id}>
                    <TableCell>
                      <div className="grid min-w-0 gap-0.5">
                        {listing.url ? (
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xs text-body font-medium text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {listing.title}
                            <ExternalLink
                              aria-hidden
                              className="ml-1.5 inline size-3.5 align-[-2px] text-ink-3"
                            />
                          </a>
                        ) : (
                          <span className="text-body font-medium text-ink">
                            {listing.title}
                          </span>
                        )}
                        <span className="text-meta text-ink-3">
                          {t("forMaterial", {
                            store: tStores(row.store),
                            material:
                              row.material?.name ?? t("unknownMaterial"),
                          })}
                        </span>
                        {(listing.typed || listing.status !== "active") && (
                          <span
                            className={cn(
                              "text-meta",
                              listing.status !== "active"
                                ? "text-danger"
                                : "text-ink-3",
                            )}
                          >
                            {listing.status !== "active"
                              ? t("unavailable")
                              : t("typed")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <div className="grid justify-items-end gap-0.5">
                        <span className="tabular-nums text-ink">
                          {money(listing.price)}
                        </span>
                        {row.material && (
                          <span className="whitespace-nowrap text-meta tabular-nums text-ink-3">
                            {t("perUnit", {
                              price: money(row.unitPrice),
                              unit: formatUnit(row.material.unit, locale),
                            })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right align-top sm:table-cell">
                      {row.previous ? (
                        <div className="grid justify-items-end gap-0.5">
                          <span
                            className={cn(
                              "tabular-nums",
                              move > 0
                                ? "text-warning"
                                : move < 0
                                  ? "text-success"
                                  : "text-ink",
                            )}
                          >
                            {signedPercent(move, locale)}
                          </span>
                          <span className="whitespace-nowrap text-meta tabular-nums text-ink-3">
                            {t("before", { price: money(row.previous.price) })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-right align-top text-ink-3 tabular-nums md:table-cell">
                      {formatDay(listing.checkedAt, locale)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {products.status === "CanLoadMore" && (
          <Button
            variant="ghost"
            className="justify-self-center"
            onClick={() => products.loadMore(PAGE)}
          >
            {tc("loadMore")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
