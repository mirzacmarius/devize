"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
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
import { formatInputNumber, formatUnit, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { RestSuggestion } from "./types";

/**
 * Adds the work a system still lacks to the Deviz, with the quantity the
 * Articole that started it call for, right after the last of them.
 */
export function RestDialog({
  estimateId,
  suggestion,
  onClose,
}: {
  estimateId: Id<"estimates">;
  suggestion: RestSuggestion | null;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog
      open={suggestion !== null}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        {suggestion && (
          <RestForm
            key={suggestion.key}
            estimateId={estimateId}
            suggestion={suggestion}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RestForm({
  estimateId,
  suggestion,
  onDone,
}: {
  estimateId: Id<"estimates">;
  suggestion: RestSuggestion;
  onDone: () => void;
}) {
  const t = useScopedI18n("compatibility.rest");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const addFromNorm = useMutation(api.estimates.lineItems.addFromNorm);
  const run = useRun();
  const { norm } = suggestion;
  const [quantity, setQuantity] = useState(() =>
    suggestion.quantity
      ? formatInputNumber(suggestion.quantity.quantity, locale)
      : "",
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = parseDecimal(quantity);
    if (value === undefined || !(value > 0)) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        addFromNorm({
          estimateId,
          normId: norm.normId,
          quantity: value,
          sectionId: suggestion.sectionId,
          afterId: suggestion.afterId,
        }),
      t("added"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("dialogTitle", { title: norm.title })}</DialogTitle>
        <DialogDescription>
          {t("dialogDescription", {
            code: norm.code,
            after: suggestion.itemTitles.at(-1) ?? "",
          })}
        </DialogDescription>
      </DialogHeader>
      <Field label={t("quantity")} htmlFor="rest-quantity" error={error}>
        <DecimalInput
          id="rest-quantity"
          suffix={formatUnit(norm.unit, locale)}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          autoFocus
          required
        />
      </Field>
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
