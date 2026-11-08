"use client";

import type {
  BasketPlan,
  BasketTotal,
} from "@devize/backend/convex/prices/basketPlan";
import type { Store } from "@devize/backend/convex/prices/resolve";
import {
  Card,
  CardContent,
  CardFrame,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { withoutVat } from "./basket-view";
import type { Basket } from "./types";

export type SingleStore = BasketTotal & { store: Store; lines: number };

/**
 * The cheapest split: its total with delivery, what goes to each store, what
 * it saves against the cheapest single store, and how it compares with the
 * prices in the Deviz.
 */
export function PlanCard({
  basket,
  plan,
  singles,
}: {
  basket: Basket;
  plan: BasketPlan | null;
  singles: SingleStore[];
}) {
  const t = useScopedI18n("prices.basket.plan");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const money = (value: number) => formatMoney(value, locale);
  const priced = basket.materials.filter((m) => m.offers.length > 0).length;

  if (!plan) {
    return (
      <CardFrame>
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="m-0 text-body text-ink-2">{t("none")}</p>
          </CardContent>
        </Card>
      </CardFrame>
    );
  }

  const planned = basket.materials.filter((m) => m.key in plan.storeOf);
  const used = Object.entries(plan.byStore) as [
    Store,
    BasketTotal & { lines: number },
  ][];
  const onlyStore = used.length === 1 ? used[0]?.[0] : undefined;
  // The cheapest store that sells everything the split buys.
  const alone = singles
    .filter((single) =>
      planned.every((m) => m.offers.some((o) => o.store === single.store)),
    )
    .sort((a, b) => a.total - b.total)[0];
  const savings = alone ? alone.total - plan.total.total : 0;
  const estimateCost = planned.reduce((sum, m) => sum + m.estimateCost, 0);
  const basketCost = withoutVat(plan.total.total, basket.estimate.vat);
  const margin = estimateCost - basketCost;

  return (
    <CardFrame>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1">
            <p className="m-0 flex flex-wrap items-baseline gap-x-2">
              <span className="text-lead tabular-nums text-ink">
                {money(plan.total.total)}
              </span>
              <span className="text-body text-ink-2">{t("totalUnit")}</span>
            </p>
            <p className="m-0 text-meta text-ink-3">
              {t("breakdown", {
                goods: money(plan.total.goods),
                delivery: money(plan.total.delivery),
              })}
            </p>
          </div>
          <ul className="m-0 grid list-none p-0">
            {used.map(([store, entry]) => (
              <li
                key={store}
                className="grid grid-cols-[minmax(0,1fr)_auto_6.5rem] items-baseline gap-x-3 border-t border-border py-1.5 text-body"
              >
                <span className="truncate text-ink">{tStores(store)}</span>
                <span className="text-meta text-ink-3">
                  {t("lines", { count: entry.lines })}
                </span>
                <span className="text-right tabular-nums text-ink">
                  {t("amount", { total: money(entry.total) })}
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-1.5 text-meta text-ink-2">
            {onlyStore ? (
              <p className="m-0">
                {t("oneStore", { store: tStores(onlyStore) })}
              </p>
            ) : (
              alone &&
              savings > 0.005 && (
                <p className="m-0 text-success">
                  {t("savings", {
                    amount: money(savings),
                    store: tStores(alone.store),
                  })}
                </p>
              )
            )}
            <p className="m-0">
              {t("coverage", { priced, total: basket.materials.length })}
            </p>
            <p className="m-0">
              {t("compare", {
                estimate: money(estimateCost),
                basket: money(basketCost),
              })}{" "}
              <span
                className={cn(margin >= 0 ? "text-success" : "text-danger")}
              >
                {margin >= 0
                  ? t("marginUp", { amount: money(margin) })
                  : t("marginDown", { amount: money(-margin) })}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </CardFrame>
  );
}
