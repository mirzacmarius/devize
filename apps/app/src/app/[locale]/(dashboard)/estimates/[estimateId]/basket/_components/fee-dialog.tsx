"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { StoreFee } from "@devize/backend/convex/prices/basketPlan";
import type { Store } from "@devize/backend/convex/prices/resolve";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { formatInputNumber, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

/**
 * What buying at a store costs the firm besides the products: delivery or
 * the trip there, and the order from which delivery is free. Kept for the
 * firm, for every Coș.
 */
export function FeeDialog({
  organizationId,
  store,
  current,
  onClose,
}: {
  organizationId: Id<"organizations">;
  store: Store | null;
  current: StoreFee | undefined;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={store !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        {store && (
          <FeeForm
            key={store}
            organizationId={organizationId}
            store={store}
            current={current}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeeForm({
  organizationId,
  store,
  current,
  onDone,
}: {
  organizationId: Id<"organizations">;
  store: Store;
  current: StoreFee | undefined;
  onDone: () => void;
}) {
  const t = useScopedI18n("prices.basket.fees");
  const tStores = useScopedI18n("stores");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const setStoreFee = useMutation(api.prices.basket.setStoreFee);
  const run = useRun();
  const [fee, setFee] = useState(() =>
    current ? formatInputNumber(current.fee, locale) : "",
  );
  const [freeFrom, setFreeFrom] = useState(() =>
    current?.freeFrom !== undefined
      ? formatInputNumber(current.freeFrom, locale)
      : "",
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const feeValue = parseDecimal(fee);
    const freeFromValue = freeFrom.trim() ? parseDecimal(freeFrom) : undefined;
    if (
      feeValue === undefined ||
      feeValue < 0 ||
      (freeFrom.trim() && (freeFromValue === undefined || freeFromValue < 0))
    ) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        setStoreFee({
          organizationId,
          store,
          fee: feeValue,
          freeFrom: freeFromValue,
        }),
      t("saved", { store: tStores(store) }),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("title", { store: tStores(store) })}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fee")} htmlFor="fee-amount" error={error}>
          <DecimalInput
            id="fee-amount"
            suffix="lei"
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            required
          />
        </Field>
        <Field label={t("freeFrom")} htmlFor="fee-free-from">
          <DecimalInput
            id="fee-free-from"
            suffix="lei"
            value={freeFrom}
            onChange={(event) => setFreeFrom(event.target.value)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
