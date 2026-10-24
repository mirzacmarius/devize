"use client";

import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardFrame,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EfacturaPill } from "@/components/invoice-status";
import { formatCalendarDate, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ValidateXml } from "./checks-card";
import type { Invoice } from "./types";
import { useDownloadInvoice } from "./use-download-invoice";

/**
 * Where an issued invoice stands with ANAF's e-Factura: the deadline to send
 * it, the XML to download and upload in SPV, and what ANAF answered.
 */
export function EfacturaCard({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.efactura");
  const locale = useCurrentLocale();
  const download = useDownloadInvoice();
  const [busy, setBusy] = useState(false);
  const { efactura } = invoice;
  const live = invoice.status === "issued" || invoice.status === "paid";
  const late =
    live && efactura.status === "not_sent" && efactura.deadline < todayInput();

  return (
    <CardFrame>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          {live && <EfacturaPill status={efactura.status} late={late} />}
        </CardHeader>
        <CardContent>
          {live && (
            <div className="grid gap-0.5">
              <span className="text-body text-ink">
                {t("deadline", {
                  date: formatCalendarDate(efactura.deadline, locale),
                })}
              </span>
              <span className="text-meta text-ink-3">{t("deadlineHint")}</span>
            </div>
          )}
          {late && (
            <p role="alert" className="m-0 text-body text-warning">
              {t("overdue")}
            </p>
          )}
          {live && efactura.status === "not_sent" && (
            <p className="m-0 text-body text-ink-2">{t("manual")}</p>
          )}
          {efactura.uploadIndex && (
            <p className="m-0 font-mono text-code text-ink-2">
              {t("uploadIndex", { index: efactura.uploadIndex })}
            </p>
          )}
          {efactura.downloadId && (
            <p className="m-0 font-mono text-code text-ink-2">
              {t("downloadId", { id: efactura.downloadId })}
            </p>
          )}
          {efactura.errors && efactura.errors.length > 0 && (
            <div className="grid gap-1">
              <span className="text-meta text-danger">{t("errors")}</span>
              <ul className="m-0 grid list-disc gap-1 pl-4 text-meta text-ink-2">
                {efactura.errors.map((error) => (
                  <li key={error} className="[overflow-wrap:anywhere]">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {live && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await download.xml(invoice._id);
                  setBusy(false);
                }}
              >
                <Download aria-hidden />
                {t("download")}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings/billing">{t("settings")}</Link>
              </Button>
            </div>
          )}
          {live && <ValidateXml invoice={invoice} />}
        </CardContent>
      </Card>
    </CardFrame>
  );
}
