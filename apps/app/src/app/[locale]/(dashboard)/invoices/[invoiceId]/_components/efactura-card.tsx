"use client";

import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { Download, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { FoldCard } from "@/components/fold-card";
import { EfacturaPill } from "@/components/invoice-status";
import { formatCalendarDate, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ValidateXml } from "./checks-card";
import type { Invoice } from "./types";
import { useDownloadInvoice } from "./use-download-invoice";

/** What's known about an invoice's way to ANAF, wherever it's shown. */
function useEfacturaParts(invoice: Invoice) {
  const t = useScopedI18n("invoices.efactura");
  const locale = useCurrentLocale();
  const download = useDownloadInvoice();
  const [busy, setBusy] = useState(false);
  const { efactura } = invoice;
  const live = invoice.status === "issued" || invoice.status === "paid";

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
  return { deadline, identifiers, xml };
}

/**
 * Where an issued invoice stands with ANAF's e-Factura: the deadline to send
 * it, the XML to download and upload in SPV, and what ANAF answered. Once ANAF
 * has accepted it there's nothing left to do: that's a row under the rail's
 * frame, not a frame.
 */
export function EfacturaCard({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.efactura");
  const { deadline, identifiers, xml } = useEfacturaParts(invoice);
  const { efactura } = invoice;
  const live = invoice.status === "issued" || invoice.status === "paid";
  const late =
    live && efactura.status === "not_sent" && efactura.deadline < todayInput();
  const settled = efactura.status === "accepted";
  const errors = efactura.errors ?? [];
  const failed = errors.length > 0;

  if (settled && !failed) {
    return null;
  }
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
        {failed && (
          <div className="grid gap-1">
            <span className="text-meta text-danger">{t("errors")}</span>
            <ul className="m-0 grid list-disc gap-1 pl-4 text-meta text-ink-2">
              {errors.map((error) => (
                <li key={error} className="[overflow-wrap:anywhere]">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!settled && xml}
      </CardContent>
    </Card>
  );
}

/** Once ANAF has accepted it: the answer, and the rest a row to open now and then. */
export function EfacturaDetails({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.efactura");
  const { deadline, identifiers, xml } = useEfacturaParts(invoice);
  if (invoice.efactura.status !== "accepted") {
    return null;
  }
  return (
    <FoldCard
      title={t("title")}
      lead={<EfacturaPill status={invoice.efactura.status} />}
    >
      {deadline}
      {identifiers}
      {xml}
    </FoldCard>
  );
}
