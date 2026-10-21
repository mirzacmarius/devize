"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { useFirm } from "@/components/firm-provider";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { thresholdOptions } from "./prices-view";

/** The change of a sent Deviz's total from which the firm gets an alert. */
export function ThresholdCard({
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

  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="m-0">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {alertPercent !== undefined && (
          // Members see the threshold; only admins change it.
          <fieldset
            disabled={!canEdit}
            className={cn("m-0 min-w-0 border-0 p-0", !canEdit && "opacity-60")}
          >
            <SegmentedControl
              label={t("label")}
              value={String(alertPercent)}
              options={thresholdOptions(alertPercent).map((percent) => ({
                value: String(percent),
                label:
                  percent === 0 ? t("off") : formatPercent(percent, locale),
              }))}
              onChange={(value) => {
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
            />
          </fieldset>
        )}
        {!canEdit && (
          <p className="m-0 text-meta text-ink-3">{t("adminOnly")}</p>
        )}
      </CardContent>
    </Card>
  );
}
