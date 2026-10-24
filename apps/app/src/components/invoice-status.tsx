"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useScopedI18n } from "@/locales/client";

export type InvoiceStatus = Doc<"invoices">["status"];
export type EfacturaStatus = Doc<"invoices">["efactura"]["status"];

const statusTones: Record<InvoiceStatus, StatusPillProps["tone"]> = {
  draft: "neutral",
  issued: "neutral",
  paid: "success",
  cancelled: "danger",
};

/**
 * Where a Factură stands: Ciornă, Emisă, Încasată, Anulată. An issued one
 * past its due date and unpaid reads Restantă.
 */
export function InvoiceStatusPill({
  status,
  overdue = false,
}: {
  status: InvoiceStatus;
  overdue?: boolean;
}) {
  const t = useScopedI18n("invoices");
  if (status === "issued" && overdue) {
    return <StatusPill tone="warning">{t("overdue")}</StatusPill>;
  }
  return (
    <StatusPill tone={statusTones[status]}>{t(`status.${status}`)}</StatusPill>
  );
}

const efacturaTones: Record<EfacturaStatus, StatusPillProps["tone"]> = {
  not_sent: "neutral",
  uploading: "neutral",
  processing: "neutral",
  accepted: "success",
  rejected: "danger",
  failed: "danger",
};

/** Where an invoice stands with ANAF; one still unsent after its deadline is flagged. */
export function EfacturaPill({
  status,
  late = false,
}: {
  status: EfacturaStatus;
  late?: boolean;
}) {
  const t = useScopedI18n("invoices");
  if (status === "not_sent" && late) {
    return <StatusPill tone="warning">{t("efacturaLate")}</StatusPill>;
  }
  return (
    <StatusPill tone={efacturaTones[status]}>
      {t(`efacturaStatus.${status}`)}
    </StatusPill>
  );
}
