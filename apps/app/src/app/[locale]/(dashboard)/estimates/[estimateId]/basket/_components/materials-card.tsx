"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  type BasketPlan,
  itemsFor,
  offerCost,
} from "@devize/backend/convex/prices/basketPlan";
import type { Store } from "@devize/backend/convex/prices/resolve";
import { storeKeys } from "@devize/backend/convex/prices/stores";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { formatMoney, formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { useRefreshedMessage } from "../../_components/estimate-actions";
import { offerAt } from "./basket-view";
import type { Basket, BasketMaterial, OpenBasketPanel } from "./types";

const headClass = "pb-2 pl-3 text-right text-label uppercase text-ink-3";

/**
 * The Deviz's materials, one row each, with what every store asks for the
 * whole quantity in whole items. The split's choice is marked; a click opens
 * the store's product, or adds one.
 */
export function MaterialsCard({
  basket,
  plan,
  leaveOut,
  open,
}: {
  basket: Basket;
  plan: BasketPlan | null;
  leaveOut: readonly Store[];
  open: OpenBasketPanel;
}) {
  const t = useScopedI18n("prices.basket.table");
  const tRefresh = useScopedI18n("prices.basket.refresh");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const refreshPrices = useMutation(api.estimates.lineItems.refreshPrices);
  const refreshedMessage = useRefreshedMessage();
  const run = useRun();
  const [refreshing, setRefreshing] = useState(false);
  const { estimate } = basket;

  const refresh = async () => {
    setRefreshing(true);
    const result = await run(() => refreshPrices({ estimateId: estimate._id }));
    setRefreshing(false);
    if (result.ok) {
      toast.success(refreshedMessage(result.value));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <CardTitle>{t("title")}</CardTitle>
        {!estimate.locked && (
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            {tRefresh("action")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <p className="m-0 text-meta text-ink-3">
          {estimate.locked ? tRefresh("locked") : tRefresh("hint")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-body">
            <thead>
              <tr>
                <th className="pb-2 text-left text-label uppercase text-ink-3">
                  {t("material")}
                </th>
                <th className={headClass}>{t("quantity")}</th>
                {storeKeys.map((store) => (
                  <th
                    key={store}
                    className={cn(
                      headClass,
                      leaveOut.includes(store) && "opacity-50",
                    )}
                  >
                    {tStores(store)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {basket.materials.map((material) => {
                const linked = Boolean(
                  material.productId || material.resourceId,
                );
                return (
                  <tr key={material.key} className="border-t border-border">
                    <td className="py-2 align-top">
                      <div className="grid">
                        <span className="text-ink">{material.name}</span>
                        <span className="text-meta text-ink-3">
                          {linked
                            ? t("inEstimate", {
                                price: formatMoney(
                                  material.estimateCost / material.quantity,
                                  locale,
                                ),
                                unit: formatUnit(material.unit, locale),
                              })
                            : t("notLinked")}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums">
                      {formatQuantity(material.quantity, locale)}{" "}
                      <span className="text-ink-3">
                        {formatUnit(material.unit, locale)}
                      </span>
                    </td>
                    {storeKeys.map((store) => (
                      <td
                        key={store}
                        className="py-1 pl-3 text-right align-top"
                      >
                        {linked ? (
                          <OfferCell
                            material={material}
                            store={store}
                            planned={plan?.storeOf[material.key] === store}
                            excluded={leaveOut.includes(store)}
                            open={open}
                          />
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {basket.omitted > 0 && (
          <p className="m-0 text-meta text-ink-3">
            {t("omitted", { count: basket.omitted })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OfferCell({
  material,
  store,
  planned,
  excluded,
  open,
}: {
  material: BasketMaterial;
  store: Store;
  planned: boolean;
  excluded: boolean;
  open: OpenBasketPanel;
}) {
  const t = useScopedI18n("prices.basket.table");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const offer = offerAt(material, store);

  if (!offer) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("-mr-2", excluded && "opacity-50")}
        onClick={() => open({ kind: "link", material, store })}
        aria-label={t("addAt", { store: tStores(store), name: material.name })}
      >
        <Plus aria-hidden />
        {t("add")}
      </Button>
    );
  }

  const count = itemsFor(material.quantity, offer.unitsPerSale);
  // One note at most: what most needs a look.
  const note =
    offer.inStock === false
      ? { text: t("outOfStock"), className: "text-danger" }
      : !offer.unitsChecked
        ? { text: t("checkUnits"), className: "text-warning" }
        : offer.typed
          ? { text: t("typed"), className: "text-ink-3" }
          : planned
            ? { text: t("planned"), className: "text-success" }
            : null;

  return (
    <button
      type="button"
      onClick={() => open({ kind: "offer", material, offer })}
      aria-label={t("openOffer", { store: tStores(store), title: offer.title })}
      className={cn(
        "-mr-2 ml-auto grid min-w-[7.5rem] justify-items-end gap-0.5 rounded-md px-2 py-1 text-right transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        planned && "bg-success-soft hover:bg-success-soft",
        excluded && "opacity-50",
      )}
    >
      <span className="font-medium tabular-nums text-ink">
        {formatMoney(offerCost(material.quantity, offer), locale)}
      </span>
      <span className="text-meta tabular-nums text-ink-3">
        {t("items", { count, price: formatMoney(offer.price, locale) })}
      </span>
      {note && (
        <span className={cn("text-meta", note.className)}>{note.text}</span>
      )}
    </button>
  );
}
