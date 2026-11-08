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
  cancelled: "declined",
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
  not_sent: "draft",
  uploading: "active",
  processing: "active",
  accepted: "success",
  rejected: "danger",
  failed: "danger",
};

/**
 * Where an invoice stands with ANAF; one still unsent after its deadline is
 * flagged. Given the deadline, an unsent one says it instead of "not sent".
 */
export function EfacturaPill({
  status,
  late = false,
  deadline,
  named = false,
}: {
  status: EfacturaStatus;
  late?: boolean;
  deadline?: string;
  // Away from a column that says it's about ANAF.
  named?: boolean;
}) {
  const t = useScopedI18n("invoices");
  if (status === "not_sent" && late) {
    const pill = (
      <StatusPill tone="danger">
        {named ? t("efacturaLateNamed") : t("efacturaLate")}
      </StatusPill>
    );
    // The day after the word, on its line, a step back: the row stays one line.
    return deadline ? (
      <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
        {pill}
        <span className="text-meta tabular-nums text-ink-3">· {deadline}</span>
      </span>
    ) : (
      pill
    );
  }
  if (status === "not_sent" && deadline) {
    return (
      <StatusPill tone="draft">
        {t("efacturaDue", { date: deadline })}
      </StatusPill>
    );
  }
  return (
    <StatusPill tone={efacturaTones[status]}>
      {t(`efacturaStatus.${status}`)}
    </StatusPill>
  );
}
