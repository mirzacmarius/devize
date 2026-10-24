"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { PageHeader } from "@devize/ui/page-header";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useFirm } from "@/components/firm-provider";
import { InvoiceStatusPill } from "@/components/invoice-status";
import { useRouteParam } from "@/components/use-route-param";
import { formatMoney, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { BuyerCard } from "./buyer-card";
import { ChecksCard } from "./checks-card";
import { DetailsCard } from "./details-card";
import { EfacturaCard } from "./efactura-card";
import { InvoiceActions } from "./invoice-actions";
import { LinesCard } from "./lines-card";
import { PaymentsCard } from "./payments-card";

/**
 * A Factură: its lines and totals, the client it names, its dates and, while
 * it is a draft, the e-Factura checks to pass before issuing. Once issued it
 * is read-only: payments are recorded, the XML goes to ANAF.
 */
export function InvoicePage() {
  const invoiceId = useRouteParam("invoiceId") as Id<"invoices">;
  const t = useScopedI18n("invoices");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const invoice = useQuery(api.invoices.invoices.get, { invoiceId });
  const setActive = useMutation(api.accounts.organizations.setActive);
  const synced = useRef<string | null>(null);

  // A link to another of the user's firms' invoices switches to that firm.
  useEffect(() => {
    if (!invoice || synced.current === invoice._id) {
      return;
    }
    synced.current = invoice._id;
    if (invoice.organizationId !== firm._id) {
      void setActive({ organizationId: invoice.organizationId });
    }
  }, [invoice, firm._id, setActive]);

  if (invoice === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const draft = invoice.status === "draft";
  const live = invoice.status === "issued" || invoice.status === "paid";
  const title = invoice.code ?? t("page.draft");
  const overdue = invoice.status === "issued" && invoice.dueDate < todayInput();

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={t("page.breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/invoices">{t("page.breadcrumbList")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </Breadcrumb>
        }
        title={title}
        status={<InvoiceStatusPill status={invoice.status} overdue={overdue} />}
        description={[
          t(`kind.${invoice.kind}`),
          invoice.buyer.name || tc("notSet"),
          t("page.totalWithVat", {
            total: formatMoney(invoice.totals.total, locale),
          }),
          invoice.estimate && t("page.deviz", { code: invoice.estimate.code }),
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={<InvoiceActions invoice={invoice} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
        <div className="grid min-w-0 gap-6">
          <LinesCard invoice={invoice} />
          {!draft && <PaymentsCard invoice={invoice} />}
        </div>
        <div className="grid min-w-0 gap-6">
          {draft && <ChecksCard invoice={invoice} />}
          {live && <EfacturaCard invoice={invoice} />}
          <BuyerCard invoice={invoice} />
          <DetailsCard invoice={invoice} />
        </div>
      </div>
    </>
  );
}
