"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useScopedI18n } from "@/locales/client";

export type InvoiceStatus = Doc<"invoices">["status"];
export type EfacturaStatus = Doc<"invoices">["efactura"]["status"];

const statusTones: Record<InvoiceStatus, StatusPillProps["tone"]> = {
  draft: "draft",
  issued: "active",
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
  plain,
}: {
  status: InvoiceStatus;
  overdue?: boolean;
  plain?: boolean;
}) {
  const t = useScopedI18n("invoices");
  if (status === "issued" && overdue) {
    return (
      <StatusPill tone="warning" plain={plain}>
        {t("overdue")}
      </StatusPill>
    );
  }
  return (
    <StatusPill tone={statusTones[status]} plain={plain}>
      {t(`status.${status}`)}
    </StatusPill>
  );
}

const efacturaTones: Record<EfacturaStatus, StatusPillProps["tone"]> = {
  not_sent: "draft",
  uploading: "active",
  processing: "active",
  accepted: "success",
  rejected: "danger",
  failed: "danger",
};

/** Where an invoice stands with ANAF; one still unsent after its deadline is flagged. */
export function EfacturaPill({
  status,
  late = false,
  plain,
}: {
  status: EfacturaStatus;
  late?: boolean;
  plain?: boolean;
}) {
  const t = useScopedI18n("invoices");
  if (status === "not_sent" && late) {
    return (
      <StatusPill tone="danger" plain={plain}>
        {t("efacturaLate")}
      </StatusPill>
    );
  }
  return (
    <StatusPill tone={efacturaTones[status]} plain={plain}>
      {t(`efacturaStatus.${status}`)}
    </StatusPill>
  );
}
