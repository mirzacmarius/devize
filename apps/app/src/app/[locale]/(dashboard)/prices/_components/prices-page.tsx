"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { PageHeader } from "@devize/ui/page-header";
import { useQuery } from "convex/react";
import { useFirm } from "@/components/firm-provider";
import { useScopedI18n } from "@/locales/client";
import { AlertsCard } from "./alerts-card";
import { ProductsCard } from "./products-card";
import { ThresholdControl } from "./threshold-control";

/**
 * Prețuri: the sent devize today's prices change, the store products the firm
 * buys with their latest price, and the firm's alert threshold.
 */
export function PricesPage() {
  const t = useScopedI18n("prices");
  const { firm } = useFirm();
  const alerts = useQuery(api.prices.alerts.list, { organizationId: firm._id });

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <ThresholdControl
            alertPercent={alerts?.alertPercent}
            canEdit={firm.role !== "member"}
          />
        }
      />
      <AlertsCard alerts={alerts} />
      <ProductsCard />
      <HowCard />
    </>
  );
}

function HowCard() {
  const t = useScopedI18n("prices.how");
  return (
    <details className="grid gap-2 text-meta">
      <summary className="text-ink-2">{t("title")}</summary>
      <ul className="m-0 mt-2 grid list-none gap-2 p-0 text-ink-3">
        <li>{t("read")}</li>
        <li>{t("check")}</li>
        <li>{t("never")}</li>
      </ul>
    </details>
  );
}
