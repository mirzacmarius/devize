"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  planBasket,
  type StoreFees,
  singleStore,
} from "@devize/backend/convex/prices/basketPlan";
import type { Store } from "@devize/backend/convex/prices/resolve";
import { storeKeys } from "@devize/backend/convex/prices/stores";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouteParam } from "@/components/use-route-param";
import { estimateCode } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { linesOf } from "./basket-view";
import { FeeDialog } from "./fee-dialog";
import { LinkDialog } from "./link-dialog";
import { MaterialsCard } from "./materials-card";
import { OfferDialog } from "./offer-dialog";
import { PlanCard } from "./plan-card";
import { StoresCard } from "./stores-card";
import type { BasketPanel } from "./types";

/**
 * The Coș: a Deviz's materials with each store's price, and the cheapest way
 * to buy them, delivery included. Leaving a store out plans again at once.
 */
export function BasketPage() {
  const estimateId = useRouteParam("estimateId") as Id<"estimates">;
  const t = useScopedI18n("prices.basket");
  const tEstimate = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const basket = useQuery(api.prices.basket.forEstimate, { estimateId });
  const [leaveOut, setLeaveOut] = useState<Store[]>([]);
  const [panel, setPanel] = useState<BasketPanel | null>(null);

  const plans = useMemo(() => {
    if (!basket) {
      return null;
    }
    const fees: StoreFees = Object.fromEntries(
      basket.storeFees.map((row) => [
        row.store,
        { fee: row.fee, freeFrom: row.freeFrom },
      ]),
    );
    const lines = linesOf(basket.materials);
    return {
      fees,
      plan: planBasket(lines, fees, leaveOut),
      singles: storeKeys.map((store) => ({
        store,
        ...singleStore(lines, store, fees),
      })),
    };
  }, [basket, leaveOut]);

  if (basket === undefined || !plans) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const { estimate } = basket;
  const code = estimateCode(estimate.number, estimate.revision);
  const close = () => setPanel(null);
  const toggle = (store: Store, used: boolean) =>
    setLeaveOut((current) =>
      used ? current.filter((other) => other !== store) : [...current, store],
    );

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={tEstimate("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/estimates">{tEstimate("breadcrumbList")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbLink asChild>
              <Link href={`/estimates/${estimate._id}`}>{code}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{t("breadcrumb")}</BreadcrumbPage>
          </Breadcrumb>
        }
        title={t("title")}
        description={t("description", { code, title: estimate.title })}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/estimates/${estimate._id}`}>
              {t("backToEstimate")}
            </Link>
          </Button>
        }
      />
      {basket.materials.length === 0 ? (
        <EmptyState
          icon={<Icons.Prices />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
          <MaterialsCard
            basket={basket}
            plan={plans.plan}
            leaveOut={leaveOut}
            open={setPanel}
          />
          {/* The answer first on a phone, beside the table on a wide screen. */}
          <div className="order-first grid min-w-0 gap-6 xl:order-none">
            <PlanCard
              basket={basket}
              plan={plans.plan}
              singles={plans.singles}
            />
            <StoresCard
              basket={basket}
              plan={plans.plan}
              singles={plans.singles}
              leaveOut={leaveOut}
              onToggle={toggle}
              open={setPanel}
            />
          </div>
        </div>
      )}

      <LinkDialog
        organizationId={estimate.organizationId}
        panel={panel?.kind === "link" || panel?.kind === "typed" ? panel : null}
        onClose={close}
        onTypePrice={(material, store) =>
          setPanel({ kind: "typed", material, store })
        }
      />
      <OfferDialog
        organizationId={estimate.organizationId}
        panel={panel?.kind === "offer" ? panel : null}
        onClose={close}
        onReplace={(material, store) =>
          setPanel({ kind: "link", material, store })
        }
      />
      <FeeDialog
        organizationId={estimate.organizationId}
        store={panel?.kind === "fee" ? panel.store : null}
        current={panel?.kind === "fee" ? plans.fees[panel.store] : undefined}
        onClose={close}
      />
    </>
  );
}
