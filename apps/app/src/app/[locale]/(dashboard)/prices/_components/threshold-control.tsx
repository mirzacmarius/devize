"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useMutation } from "convex/react";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { thresholdOptions } from "./prices-view";

/** The change of a sent Deviz's total from which the firm gets an alert. */
export function ThresholdControl({
  alertPercent,
  canEdit,
}: {
  alertPercent: number | undefined;
  canEdit: boolean;
}) {
  const t = useScopedI18n("prices.threshold");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const setThreshold = useMutation(api.prices.alerts.setThreshold);
  const run = useRun();

  if (alertPercent === undefined) {
    return null;
  }
  return (
    // Members see the threshold; only admins change it.
    <div
      className="flex items-center gap-2"
      title={canEdit ? undefined : t("adminOnly")}
    >
      <span className="text-meta text-ink-3">{t("title")}</span>
      <Select
        value={String(alertPercent)}
        disabled={!canEdit}
        onValueChange={(value) => {
          if (Number(value) !== alertPercent) {
            void run(
              () =>
                setThreshold({
                  organizationId: firm._id,
                  percent: Number(value),
                }),
              t("saved"),
            );
          }
        }}
      >
        <SelectTrigger
          className="h-8 w-24 gap-1.5 px-2.5 py-1"
          aria-label={t("label")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {thresholdOptions(alertPercent).map((percent) => (
            <SelectItem key={percent} value={String(percent)}>
              {percent === 0 ? t("off") : formatPercent(percent, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
