"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { RotateCcw } from "lucide-react";
import { InlineNumber } from "@/components/inline-number";
import { useRun } from "@/components/use-run";
import {
  formatConsumption,
  formatMoney,
  formatPercent,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { LineItem, LineItemResource } from "./types";

const kindOrder = ["material", "labor", "equipment", "transport"] as const;

const isPercent = (resource: LineItemResource) => resource.unit === "%";

const sourceTones: Partial<Record<LineItemResource["priceSource"], string>> = {
  missing: "text-danger",
  manual: "text-warning",
};

/**
 * What one unit of a line item costs, resource by resource. A "%" resource is
 * a share of the line's materials (or of its own kind for labour and
 * equipment), as estimates/recap.ts computes it.
 */
function valuesPerUnit(resources: readonly LineItemResource[]) {
  const base = { material: 0, labor: 0, equipment: 0, transport: 0 };
  for (const resource of resources) {
    if (!isPercent(resource)) {
      base[resource.kind] += resource.quantity * resource.unitPrice;
    }
  }
  return new Map(
    resources.map((resource) => {
      if (!isPercent(resource)) {
        return [resource.key, resource.quantity * resource.unitPrice];
      }
      const of = resource.kind === "transport" ? "material" : resource.kind;
      return [resource.key, (base[of] * resource.quantity) / 100];
    }),
  );
}

/**
 * A line item's resources with their consumption and prices, editable while
 * the Deviz is a draft. Where each price comes from shows under it.
 */
export function ResourceTable({
  item,
  editable,
}: {
  item: LineItem;
  editable: boolean;
}) {
  const t = useScopedI18n("estimate");
  const tKinds = useScopedI18n("resources");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const updateResource = useMutation(api.estimates.lineItems.updateResource);
  const run = useRun();
  const values = valuesPerUnit(item.resources);
  const rows = [...item.resources].sort(
    (a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind),
  );

  const source = (resource: LineItemResource) => {
    switch (resource.priceSource) {
      case "listing":
        return resource.store ? tStores(resource.store) : t("sources.listing");
      default:
        return t(`sources.${resource.priceSource}`);
    }
  };

  return (
    <div className="grid gap-2 rounded-md border border-border bg-sunken px-4 py-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-body">
          <thead>
            <tr>
              <th className="pb-2 text-left text-label uppercase text-ink-3">
                {t("resourceColumns.resource")}
              </th>
              <th className="pb-2 pl-3 text-right text-label uppercase text-ink-3">
                {t("resourceColumns.consumption")}
              </th>
              <th className="pb-2 pl-3 text-right text-label uppercase text-ink-3">
                {t("resourceColumns.price")}
              </th>
              <th className="pb-2 pl-3 text-right text-label uppercase text-ink-3">
                {t("resourceColumns.value", {
                  unit: formatUnit(item.unit, locale),
                })}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((resource) => (
              <tr key={resource.key} className="border-t border-border">
                <td className="py-2 align-top">
                  <div className="grid">
                    <span className="text-ink">{resource.name}</span>
                    <span className="text-meta text-ink-3">
                      {tKinds(`kinds.${resource.kind}`)}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right align-top">
                  <InlineNumber
                    value={resource.quantity}
                    format={(value) =>
                      isPercent(resource)
                        ? formatPercent(value, locale)
                        : formatConsumption(value, locale)
                    }
                    label={t("consumptionOf", { name: resource.name })}
                    disabled={!editable}
                    // Up by the field's padding, level with the name.
                    className="-my-1.5 w-20"
                    onCommit={(quantity) =>
                      run(() =>
                        updateResource({
                          lineItemId: item._id,
                          key: resource.key,
                          quantity,
                        }),
                      )
                    }
                  />
                  {/* A unit column of its own, so the numbers line up. */}
                  <span className="ml-1 inline-block min-w-8 text-left text-ink-3">
                    {!isPercent(resource) && formatUnit(resource.unit, locale)}
                  </span>
                </td>
                <td className="py-2 pl-3 text-right align-top">
                  {isPercent(resource) ? (
                    <span className="text-meta text-ink-3">
                      {resource.kind === "labor"
                        ? t("percentOfLabor")
                        : resource.kind === "equipment"
                          ? t("percentOfEquipment")
                          : t("percentOfMaterials")}
                    </span>
                  ) : (
                    <>
                      <InlineNumber
                        value={resource.unitPrice}
                        format={(value) => formatMoney(value, locale)}
                        label={t("priceOf", { name: resource.name })}
                        disabled={!editable}
                        className="-my-1.5 w-20"
                        onCommit={(unitPrice) =>
                          run(() =>
                            updateResource({
                              lineItemId: item._id,
                              key: resource.key,
                              unitPrice,
                            }),
                          )
                        }
                      />
                      <span
                        className={cn(
                          "flex items-center justify-end gap-1 whitespace-nowrap text-meta",
                          sourceTones[resource.priceSource] ?? "text-ink-3",
                        )}
                      >
                        {source(resource)}
                        {editable && resource.priceSource === "manual" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-5 text-ink-3 [&_svg]:size-3.5"
                            aria-label={t("automaticPrice", {
                              name: resource.name,
                            })}
                            title={t("automaticPriceHint")}
                            onClick={() =>
                              run(() =>
                                updateResource({
                                  lineItemId: item._id,
                                  key: resource.key,
                                  automatic: true,
                                }),
                              )
                            }
                          >
                            <RotateCcw aria-hidden />
                          </Button>
                        )}
                      </span>
                    </>
                  )}
                </td>
                <td className="py-2 pl-3 text-right align-top tabular-nums text-ink">
                  {formatMoney(values.get(resource.key) ?? 0, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <p className="m-0 text-meta text-ink-3">{t("resourcesHint")}</p>
      )}
    </div>
  );
}
