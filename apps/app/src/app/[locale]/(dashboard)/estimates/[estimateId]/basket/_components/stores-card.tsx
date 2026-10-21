"use client";

import {
  type BasketPlan,
  itemsFor,
} from "@devize/backend/convex/prices/basketPlan";
import type { Store } from "@devize/backend/convex/prices/resolve";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { Switch } from "@devize/ui/switch";
import { cn } from "@devize/ui/utils";
import { Truck } from "lucide-react";
import { estimateCode, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { offerAt, shoppingList } from "./basket-view";
import type { SingleStore } from "./plan-card";
import type { Basket, OpenBasketPanel } from "./types";

/**
 * The four stores: whether the split may use each, how much of the Deviz it
 * sells and for how much, its delivery, and the list to take there.
 */
export function StoresCard({
  basket,
  plan,
  singles,
  leaveOut,
  onToggle,
  open,
}: {
  basket: Basket;
  plan: BasketPlan | null;
  singles: SingleStore[];
  leaveOut: readonly Store[];
  onToggle: (store: Store, used: boolean) => void;
  open: OpenBasketPanel;
}) {
  const t = useScopedI18n("prices.basket.stores");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const money = (value: number) => formatMoney(value, locale);
  const { estimate } = basket;

  const copyList = async (store: Store) => {
    const entry = plan?.byStore[store];
    if (!plan || !entry) {
      return;
    }
    const items = basket.materials.flatMap((material) => {
      const offer =
        plan.storeOf[material.key] === store
          ? offerAt(material, store)
          : undefined;
      return offer
        ? [
            {
              count: itemsFor(material.quantity, offer.unitsPerSale),
              title: offer.title,
              price: `${money(offer.price)} lei`,
              url: offer.url,
            },
          ]
        : [];
    });
    const text = shoppingList({
      heading: `${tStores(store)} · ${estimateCode(estimate.number, estimate.revision)} ${estimate.title}`,
      items,
      total: t("copyTotal", { total: money(entry.total) }),
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied", { store: tStores(store) }));
    } catch {
      toast.error(text);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="gap-0">
        {singles.map((single, index) => {
          const { store } = single;
          const used = !leaveOut.includes(store);
          const fee = basket.storeFees.find((row) => row.store === store);
          const inPlan = plan?.byStore[store];
          return (
            <section
              key={store}
              aria-label={tStores(store)}
              className={cn(
                "grid gap-2 py-3",
                index > 0 && "border-t border-border",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "text-body font-medium",
                    used ? "text-ink" : "text-ink-3",
                  )}
                >
                  {tStores(store)}
                </span>
                <Switch
                  checked={used}
                  onCheckedChange={(checked) => onToggle(store, checked)}
                  aria-label={t("use", { store: tStores(store) })}
                />
              </div>
              <p className="m-0 text-meta text-ink-3">
                {single.lines > 0
                  ? `${t("covered", {
                      count: single.lines,
                      total: basket.materials.length,
                    })} · ${t("alone", { total: money(single.total) })}`
                  : t("nothing")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => open({ kind: "fee", store })}
                  aria-label={t("editFee", { store: tStores(store) })}
                >
                  <Truck aria-hidden />
                  {fee
                    ? fee.freeFrom !== undefined
                      ? t("feeFree", {
                          fee: money(fee.fee),
                          freeFrom: money(fee.freeFrom),
                        })
                      : t("fee", { fee: money(fee.fee) })
                    : t("feeUnset")}
                </Button>
                {inPlan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyList(store)}
                  >
                    <Icons.Copy aria-hidden />
                    {t("copy")}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
