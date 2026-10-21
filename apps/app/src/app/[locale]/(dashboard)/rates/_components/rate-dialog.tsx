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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { type Resource, ResourcePicker } from "@/components/resource-picker";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { formatInputNumber, formatUnit, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Rate } from "./rates-page";

type RateKind = "labor" | "equipment" | "transport";
type Scope = "all" | "resource";

// The units rates are usually counted in: hours and days of work or
// machines, and transport by distance, weight, volume or trip.
const rateUnits = ["ora", "zi", "km", "t", "mc", "buc", "set"] as const;

/** Adds a rate, or changes the name and price of one. */
export function RateDialog({
  open,
  rate,
  onOpenChange,
}: {
  open: boolean;
  rate: Rate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useScopedI18n("rates");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{rate ? t("editTitle") : t("newTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        {open && (
          <RateForm
            key={rate?._id ?? "new"}
            rate={rate}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RateForm({ rate, onDone }: { rate: Rate | null; onDone: () => void }) {
  const t = useScopedI18n("rates");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const set = useMutation(api.accounts.rates.set);
  const run = useRun();
  const [kind, setKind] = useState<RateKind>(
    rate && rate.kind !== "material" ? rate.kind : "labor",
  );
  const [scope, setScope] = useState<Scope>(
    rate?.resourceId ? "resource" : "all",
  );
  const [resource, setResource] = useState<Pick<
    Resource,
    "_id" | "name" | "unit"
  > | null>(
    rate?.resourceId
      ? { _id: rate.resourceId, name: rate.name, unit: rate.unit }
      : null,
  );
  const [name, setName] = useState(rate?.name ?? "");
  const [unit, setUnit] = useState(rate?.unit ?? "ora");
  const [price, setPrice] = useState(
    rate ? formatInputNumber(rate.price, locale) : "",
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const editing = rate !== null;
  const effectiveUnit = scope === "resource" ? (resource?.unit ?? unit) : unit;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = parseDecimal(price);
    if (scope === "resource" && !resource) {
      setError(t("resourceRequired"));
      return;
    }
    if (value === undefined || value < 0) {
      setError(t("priceInvalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        set({
          organizationId: firm._id,
          kind,
          resourceId: scope === "resource" ? resource?._id : undefined,
          name: name.trim() || resource?.name || t(`kinds.${kind}`),
          unit: effectiveUnit,
          price: value,
        }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      {!editing && (
        <>
          <Field label={t("fields.kind")}>
            <SegmentedControl
              label={t("fields.kind")}
              value={kind}
              onChange={(value) => {
                setKind(value);
                setResource(null);
              }}
              options={[
                { value: "labor", label: t("kinds.labor") },
                { value: "equipment", label: t("kinds.equipment") },
                { value: "transport", label: t("kinds.transport") },
              ]}
            />
          </Field>
          <Field
            label={t("fields.scope")}
            hint={scope === "all" ? t("scopeAllHint") : t("scopeResourceHint")}
          >
            <SegmentedControl
              label={t("fields.scope")}
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: t("scopeAll") },
                { value: "resource", label: t("scopeResource") },
              ]}
            />
          </Field>
        </>
      )}
      {scope === "resource" &&
        (resource ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
            <span className="min-w-0 truncate text-body text-ink">
              {resource.name}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-meta text-ink-3">
              {formatUnit(resource.unit, locale)}
              {!editing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("changeResource")}
                  onClick={() => setResource(null)}
                >
                  <X aria-hidden />
                </Button>
              )}
            </span>
          </div>
        ) : (
          <Field label={t("fields.resource")} htmlFor="rate-resource">
            <ResourcePicker
              id="rate-resource"
              kind={kind}
              onPick={(picked) => {
                setResource(picked);
                setName(picked.name);
              }}
            />
          </Field>
        ))}
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
        <Field label={t("fields.name")} htmlFor="rate-name">
          <Input
            id="rate-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t(`namePlaceholders.${kind}`)}
          />
        </Field>
        {scope === "all" && (
          <Field label={t("fields.unit")} htmlFor="rate-unit">
            <Select value={unit} onValueChange={setUnit} disabled={editing}>
              <SelectTrigger id="rate-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rateUnits.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatUnit(value, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
      <Field label={t("fields.price")} htmlFor="rate-price" error={error}>
        <DecimalInput
          id="rate-price"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          suffix={t("perUnit", { unit: formatUnit(effectiveUnit, locale) })}
          aria-invalid={error !== undefined}
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
