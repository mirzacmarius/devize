"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

/**
 * The invoices an accepted Deviz can bill next, soonest first: the advance the
 * Ofertă asked, then the final invoice with the advances deducted.
 */
export function useInvoiceActions(
  estimateId: Id<"estimates">,
  enabled: boolean,
) {
  const t = useScopedI18n("invoices");
  const locale = useCurrentLocale();
  const router = useRouter();
  const run = useRun();
  const billing = useQuery(
    api.invoices.invoices.forEstimate,
    enabled ? { estimateId } : "skip",
  );
  const createAdvance = useMutation(api.invoices.invoices.createAdvance);
  const createFinal = useMutation(api.invoices.invoices.createFinal);
  const [busy, setBusy] = useState(false);

  const create = async (action: () => Promise<string>) => {
    setBusy(true);
    const result = await run(action, t("card.created"));
    setBusy(false);
    if (result.ok) {
      router.push(`/invoices/${result.value}`);
    }
  };

  const actions: { key: string; label: string; run: () => void }[] = [];
  const deposit = billing?.accepted?.depositPercent;
  if (billing?.canAdvance && deposit != null) {
    actions.push({
      key: "advance",
      label: t("card.advance", { percent: formatPercent(deposit, locale) }),
      run: () => void create(() => createAdvance({ estimateId })),
    });
  }
  if (billing?.canFinal) {
    actions.push({
      key: "final",
      label: t("card.final"),
      run: () => void create(() => createFinal({ estimateId })),
    });
  }
  return { actions, busy };
}
