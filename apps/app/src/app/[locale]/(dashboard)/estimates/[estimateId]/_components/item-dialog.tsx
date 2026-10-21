"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { formatInputNumber, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { LineItem } from "./types";

/**
 * Edits a line item's text and quantity. A norm's code and unit stay as the
 * norm has them; an item of the firm's own can change them too.
 */
export function ItemDialog({
  item,
  onClose,
}: {
  item: LineItem | null;
  onClose: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={item !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("itemDialog.title")}</DialogTitle>
          <DialogDescription>
            {item?.origin === "norm"
              ? t("itemDialog.normDescription")
              : t("itemDialog.description")}
          </DialogDescription>
        </DialogHeader>
        {item && <ItemForm key={item._id} item={item} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({ item, onDone }: { item: LineItem; onDone: () => void }) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const update = useMutation(api.estimates.lineItems.update);
  const run = useRun();
  const own = item.origin !== "norm";
  const [title, setTitle] = useState(item.title);
  const [code, setCode] = useState(item.code === "—" ? "" : item.code);
  const [unit, setUnit] = useState(item.unit);
  const [quantity, setQuantity] = useState(() =>
    formatInputNumber(item.quantity, locale),
  );
  const [notes, setNotes] = useState(item.notes ?? "");
  const [errors, setErrors] = useState<{
    title?: string;
    unit?: string;
    quantity?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = parseDecimal(quantity);
    const found = {
      title: title.trim() ? undefined : t("itemDialog.titleRequired"),
      unit: !own || unit.trim() ? undefined : t("itemDialog.unitRequired"),
      quantity:
        amount !== undefined && amount >= 0
          ? undefined
          : t("itemDialog.quantityInvalid"),
    };
    setErrors(found);
    if (found.title || found.unit || found.quantity || amount === undefined) {
      return;
    }
    setSaving(true);
    const result = await run(
      () =>
        update({
          lineItemId: item._id,
          title: title.trim(),
          quantity: amount,
          notes,
          ...(own ? { code: code.trim(), unit: unit.trim() } : {}),
        }),
      t("itemDialog.saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field
        label={t("itemDialog.itemTitle")}
        htmlFor="item-title"
        error={errors.title}
      >
        <Textarea
          id="item-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          rows={2}
          aria-invalid={errors.title !== undefined}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label={t("itemDialog.code")}
          htmlFor="item-code"
          hint={own ? undefined : t("itemDialog.fromNorm")}
        >
          <Input
            id="item-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={!own}
            className="font-mono"
          />
        </Field>
        <Field
          label={t("itemDialog.unit")}
          htmlFor="item-unit"
          error={errors.unit}
          hint={own ? undefined : t("itemDialog.fromNorm")}
        >
          <Input
            id="item-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            disabled={!own}
            aria-invalid={errors.unit !== undefined}
          />
        </Field>
        <Field
          label={t("itemDialog.quantity")}
          htmlFor="item-quantity"
          error={errors.quantity}
        >
          <DecimalInput
            id="item-quantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={errors.quantity !== undefined}
          />
        </Field>
      </div>
      <Field
        label={t("itemDialog.notes")}
        htmlFor="item-notes"
        hint={t("itemDialog.notesHint")}
      >
        <Textarea
          id="item-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
