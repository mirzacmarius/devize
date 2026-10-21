"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { PageHeader } from "@devize/ui/page-header";
import { useQuery } from "convex/react";
import { useFirm } from "@/components/firm-provider";
import { useScopedI18n } from "@/locales/client";
import { AlertsCard } from "./alerts-card";
import { ProductsCard } from "./products-card";
import { ThresholdCard } from "./threshold-card";

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
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
        <div className="grid min-w-0 gap-6">
          <AlertsCard alerts={alerts} />
          <ProductsCard />
        </div>
        <div className="grid min-w-0 gap-6">
          <ThresholdCard
            alertPercent={alerts?.alertPercent}
            canEdit={firm.role !== "member"}
          />
          <HowCard />
        </div>
      </div>
    </>
  );
}

function HowCard() {
  const t = useScopedI18n("prices.how");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="m-0 grid list-disc gap-2 pl-5 text-body text-ink-2">
          <li>{t("read")}</li>
          <li>{t("check")}</li>
          <li>{t("never")}</li>
        </ul>
      </CardContent>
    </Card>
  );
}
