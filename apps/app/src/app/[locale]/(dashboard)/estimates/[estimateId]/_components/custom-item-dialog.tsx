"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc, Id } from "@devize/backend/convex/_generated/dataModel";
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
import { Plus, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { ResourcePicker } from "@/components/resource-picker";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { formatInputNumber, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { SectionSelect } from "./section-select";
import type { Estimate } from "./types";

type Kind = Doc<"resources">["kind"];
type Mode = "simple" | "detailed";

const kinds: readonly Kind[] = ["material", "labor", "equipment", "transport"];

type ResourceRow = {
  id: string;
  kind: Kind;
  name: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  resourceId?: Id<"resources">;
};

let nextRow = 0;
const emptyRow = (kind: Kind = "material"): ResourceRow => ({
  id: `row-${++nextRow}`,
  kind,
  name: "",
  unit: "",
  quantity: "1",
  unitPrice: "",
});

/**
 * Adds a line item that isn't in the catalog, such as removing rubble, with
 * prices typed by hand: one price per unit, or resource by resource.
 */
export function CustomItemDialog({
  estimate,
  open,
  sectionId,
  onClose,
}: {
  estimate: Estimate;
  open: boolean;
  sectionId: Id<"sections"> | undefined;
  onClose: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        closeLabel={tc("close")}
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{t("custom.title")}</DialogTitle>
          <DialogDescription>{t("custom.description")}</DialogDescription>
        </DialogHeader>
        {open && (
          <CustomItemForm
            estimate={estimate}
            initialSectionId={sectionId}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomItemForm({
  estimate,
  initialSectionId,
  onDone,
}: {
  estimate: Estimate;
  initialSectionId: Id<"sections"> | undefined;
  onDone: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const tKinds = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const addCustom = useMutation(api.estimates.lineItems.addCustom);
  const run = useRun();
  const ids = useId();
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [mode, setMode] = useState<Mode>("simple");
  const [kind, setKind] = useState<Kind>("material");
  const [price, setPrice] = useState("");
  const [rows, setRows] = useState<ResourceRow[]>(() => [emptyRow()]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const updateRow = (id: string, patch: Partial<ResourceRow>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );

  /** The resources to send, or why they can't be sent. */
  const resources = () => {
    if (mode === "simple") {
      const unitPrice = parseDecimal(price);
      if (unitPrice === undefined || unitPrice < 0) {
        return t("custom.priceInvalid");
      }
      // One unit of the item costs its price.
      return [
        { kind, name: title.trim(), unit: unit.trim(), quantity: 1, unitPrice },
      ];
    }
    if (rows.length === 0) {
      return t("custom.resourcesRequired");
    }
    const result = [];
    for (const row of rows) {
      const amount = parseDecimal(row.quantity);
      const unitPrice = parseDecimal(row.unitPrice);
      if (
        !row.name.trim() ||
        !row.unit.trim() ||
        amount === undefined ||
        amount < 0 ||
        unitPrice === undefined ||
        unitPrice < 0
      ) {
        return t("custom.rowInvalid");
      }
      result.push({
        kind: row.kind,
        name: row.name.trim(),
        unit: row.unit.trim(),
        quantity: amount,
        unitPrice,
        resourceId: row.resourceId,
      });
    }
    return result;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = parseDecimal(quantity);
    if (!title.trim()) {
      setError(t("custom.titleRequired"));
      return;
    }
    if (!unit.trim()) {
      setError(t("custom.unitRequired"));
      return;
    }
    if (amount === undefined || amount < 0) {
      setError(t("custom.quantityInvalid"));
      return;
    }
    const list = resources();
    if (typeof list === "string") {
      setError(list);
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        addCustom({
          estimateId: estimate._id,
          title: title.trim(),
          code: code.trim() || undefined,
          unit: unit.trim(),
          quantity: amount,
          resources: list,
          sectionId,
        }),
      t("custom.added"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label={t("custom.itemTitle")} htmlFor={`${ids}-title`}>
        <Input
          id={`${ids}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("custom.titlePlaceholder")}
          autoFocus
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[120px_100px_140px_minmax(0,1fr)]">
        <Field label={t("custom.code")} htmlFor={`${ids}-code`}>
          <Input
            id={`${ids}-code`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label={t("custom.unit")} htmlFor={`${ids}-unit`}>
          <Input
            id={`${ids}-unit`}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="mp"
          />
        </Field>
        <Field label={t("custom.quantity")} htmlFor={`${ids}-quantity`}>
          <DecimalInput
            id={`${ids}-quantity`}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        {estimate.sections.length > 0 && (
          <Field label={t("custom.section")} htmlFor={`${ids}-section`}>
            <SectionSelect
              id={`${ids}-section`}
              sections={estimate.sections}
              value={sectionId}
              onChange={setSectionId}
            />
          </Field>
        )}
      </div>
      <Field label={t("custom.pricing")}>
        <SegmentedControl
          label={t("custom.pricing")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "simple", label: t("custom.simple") },
            { value: "detailed", label: t("custom.detailed") },
          ]}
        />
      </Field>
      {mode === "simple" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("custom.kind")}
            htmlFor={`${ids}-kind`}
            hint={t("custom.kindHint")}
          >
            <KindSelect id={`${ids}-kind`} value={kind} onChange={setKind} />
          </Field>
          <Field label={t("custom.price")} htmlFor={`${ids}-price`}>
            <DecimalInput
              id={`${ids}-price`}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              suffix={
                unit.trim() ? t("custom.perUnit", { unit: unit.trim() }) : "lei"
              }
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="m-0 text-meta text-ink-3">
            {t("custom.detailedHint", {
              unit: unit.trim() || t("custom.unitFallback"),
            })}
          </p>
          <ul className="m-0 grid list-none gap-3 p-0">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className="grid items-end gap-2 rounded-md border border-border bg-sunken p-3 sm:grid-cols-[130px_minmax(0,1fr)_80px_100px_110px_36px] sm:border-0 sm:bg-transparent sm:p-0"
              >
                <Field
                  label={t("custom.columns.kind")}
                  htmlFor={`${ids}-${row.id}-kind`}
                  className={index > 0 ? "sm:[&>label]:sr-only" : undefined}
                >
                  <KindSelect
                    id={`${ids}-${row.id}-kind`}
                    value={row.kind}
                    onChange={(value) => updateRow(row.id, { kind: value })}
                  />
                </Field>
                <Field
                  label={t("custom.columns.name")}
                  htmlFor={`${ids}-${row.id}-name`}
                  className={index > 0 ? "sm:[&>label]:sr-only" : undefined}
                >
                  <Input
                    id={`${ids}-${row.id}-name`}
                    value={row.name}
                    onChange={(event) =>
                      updateRow(row.id, {
                        name: event.target.value,
                        resourceId: undefined,
                      })
                    }
                  />
                </Field>
                <Field
                  label={t("custom.columns.unit")}
                  htmlFor={`${ids}-${row.id}-unit`}
                  className={index > 0 ? "sm:[&>label]:sr-only" : undefined}
                >
                  <Input
                    id={`${ids}-${row.id}-unit`}
                    value={row.unit}
                    onChange={(event) =>
                      updateRow(row.id, { unit: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label={t("custom.columns.quantity")}
                  htmlFor={`${ids}-${row.id}-quantity`}
                  className={index > 0 ? "sm:[&>label]:sr-only" : undefined}
                >
                  <DecimalInput
                    id={`${ids}-${row.id}-quantity`}
                    value={row.quantity}
                    onChange={(event) =>
                      updateRow(row.id, { quantity: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label={t("custom.columns.price")}
                  htmlFor={`${ids}-${row.id}-price`}
                  className={index > 0 ? "sm:[&>label]:sr-only" : undefined}
                >
                  <DecimalInput
                    id={`${ids}-${row.id}-price`}
                    value={row.unitPrice}
                    onChange={(event) =>
                      updateRow(row.id, { unitPrice: event.target.value })
                    }
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("custom.removeRow", {
                    name: row.name || tKinds(`kinds.${row.kind}`),
                  })}
                  onClick={() =>
                    setRows((current) =>
                      current.filter((other) => other.id !== row.id),
                    )
                  }
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRows((current) => [...current, emptyRow()])}
            >
              <Plus aria-hidden />
              {t("custom.addRow")}
            </Button>
            <ResourcePicker
              onPick={(resource) =>
                setRows((current) => [
                  // A row still empty makes room for the one picked.
                  ...current.filter(
                    (row) => row.name.trim() || row.unitPrice.trim(),
                  ),
                  {
                    ...emptyRow(resource.kind),
                    name: resource.name,
                    unit: resource.unit,
                    unitPrice:
                      resource.referencePrice === undefined
                        ? ""
                        : formatInputNumber(resource.referencePrice, locale),
                    resourceId: resource._id,
                  },
                ])
              }
            />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-meta text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("custom.add")}
        </Button>
      </div>
    </form>
  );
}

function KindSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Kind;
  onChange: (value: Kind) => void;
}) {
  const t = useScopedI18n("resources");
  return (
    <Select value={value} onValueChange={(next) => onChange(next as Kind)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {kinds.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {t(`kinds.${kind}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
