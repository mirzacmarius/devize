"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Finding } from "@devize/backend/convex/invoices/rules";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardFrame,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { useAction } from "convex/react";
import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { formatDay, formatTime } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";

/**
 * What the e-Factura XML would lack, checked as the draft is shaped: an error
 * stops issuing, a warning is something to know. ANAF's own validator can be
 * asked too.
 */
export function ChecksCard({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.checks");
  const findingText = useFindingText();
  const errors = invoice.findings.filter((f) => f.severity === "error").length;
  const warnings = invoice.findings.length - errors;
  return (
    <CardFrame>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <span className="text-meta text-ink-3 tabular-nums">
            {[
              errors > 0 && t("errors", { count: errors }),
              warnings > 0 && t("warnings", { count: warnings }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </CardHeader>
        <CardContent>
          {invoice.findings.length === 0 ? (
            <FindingRow severity="ok" text={t("ok")} />
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {invoice.findings.map((finding) => (
                <li key={`${finding.id}-${finding.line ?? ""}`}>
                  <FindingRow
                    severity={finding.severity}
                    text={findingText(finding)}
                  />
                </li>
              ))}
            </ul>
          )}
          <ValidateXml invoice={invoice} />
        </CardContent>
      </Card>
    </CardFrame>
  );
}

const ringClass = {
  ok: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  error: "bg-danger-soft text-danger",
};

function FindingRow({
  severity,
  text,
}: {
  severity: "ok" | "warning" | "error";
  text: string;
}) {
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full",
          ringClass[severity],
        )}
      >
        {severity === "ok" && <Check className="size-3.5" aria-hidden />}
        {severity === "warning" && (
          <CircleAlert className="size-3.5" aria-hidden />
        )}
        {severity === "error" && (
          <TriangleAlert className="size-3.5" aria-hidden />
        )}
      </span>
      <span className="text-body text-ink">{text}</span>
    </div>
  );
}

/** A finding as a sentence, naming its line when it has one. */
export function useFindingText() {
  const t = useScopedI18n("invoices.checks");
  return (finding: Finding) => {
    const text = t(`findings.${finding.id}`);
    return finding.line === undefined
      ? text
      : t("line", { line: finding.line, text });
  };
}

/** Asks ANAF's public validator about the invoice's XML, and shows its last answer. */
export function ValidateXml({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.checks");
  const locale = useCurrentLocale();
  const run = useRun();
  const validate = useAction(api.invoices.anaf.validate);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[] | null>(null);
  const last = invoice.validation;

  const check = async () => {
    setBusy(true);
    const result = await run(() => validate({ invoiceId: invoice._id }));
    setBusy(false);
    if (!result.ok) {
      return;
    }
    const { outcome } = result.value;
    if (outcome === "ok") {
      setMessages([]);
      toast.success(t("validOk"));
    } else if (outcome === "nok") {
      setMessages(result.value.messages);
      toast.error(t("validNok"));
    } else {
      toast.error(t("validUnavailable"));
    }
  };

  const shown = messages ?? last?.messages ?? [];

  return (
    <div className="grid gap-2 border-t border-border pt-3">
      {last && (
        <p
          className={cn(
            "m-0 text-meta",
            last.ok ? "text-ink-3" : "text-danger",
          )}
        >
          {t(last.ok ? "lastValid" : "lastInvalid", {
            date: `${formatDay(last.checkedAt, locale)}, ${formatTime(last.checkedAt, locale)}`,
          })}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="m-0 grid list-disc gap-1 pl-4 text-meta text-ink-2">
          {shown.map((message) => (
            <li key={message} className="[overflow-wrap:anywhere]">
              {message}
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={busy}
        onClick={check}
      >
        {busy && <Icons.Loader className="animate-spin" aria-hidden />}
        {t("validate")}
      </Button>
    </div>
  );
}
