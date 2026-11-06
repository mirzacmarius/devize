"use client";

import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { Download, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { FoldRow, LinkRow } from "@/components/fold-card";
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
  const settled = efactura.status === "accepted";

  const deadline = live && (
    <div className="grid gap-0.5">
      <span className="text-body text-ink">
        {t("deadline", {
          date: formatCalendarDate(efactura.deadline, locale),
        })}
      </span>
      <span className="text-meta text-ink-3">{t("deadlineHint")}</span>
    </div>
  );
  const identifiers = (efactura.uploadIndex || efactura.downloadId) && (
    <p className="m-0 grid gap-0.5 text-meta tabular-nums text-ink-3">
      {efactura.uploadIndex && (
        <span>{t("uploadIndex", { index: efactura.uploadIndex })}</span>
      )}
      {efactura.downloadId && (
        <span>{t("downloadId", { id: efactura.downloadId })}</span>
      )}
    </p>
  );
  const xml = live && (
    <ValidateXml invoice={invoice}>
      <Button
        type="button"
        variant={efactura.status === "not_sent" ? "default" : "outline"}
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
    </ValidateXml>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {live && <EfacturaPill status={efactura.status} late={late} />}
      </CardHeader>
      <CardContent>
        {!settled && deadline}
        {late && (
          <p role="alert" className="m-0 flex gap-2 text-body text-ink">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-warning"
            />
            {t("overdue")}
          </p>
        )}
        {live && efactura.status === "not_sent" && (
          <p className="m-0 text-body text-ink-2">{t("manual")}</p>
        )}
        {!settled && identifiers}
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
        {!settled && xml}
        <div className="grid">
          {settled && (
            <FoldRow title={t("details")}>
              {deadline}
              {identifiers}
              {xml}
            </FoldRow>
          )}
          {live && <LinkRow title={t("settings")} href="/settings/billing" />}
        </div>
      </CardContent>
    </Card>
  );
}
