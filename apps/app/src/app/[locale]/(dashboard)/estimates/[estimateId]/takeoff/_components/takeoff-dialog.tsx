"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  deductionsOf,
  rowsTotal,
  type TakeoffRow,
  takeoffTotal,
  unitParts,
} from "@devize/backend/convex/takeoffs/measures";
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
import { Input } from "@devize/ui/input";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { formatInputNumber, formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { evaluateExpression } from "./expression";
import type { Target } from "./types";

type RowDraft = {
  key: number;
  label: string;
  count: string;
  length: string;
  width: string;
  height: string;
  deduct: boolean;
};

const emptyRow = (key: number, deduct = false): RowDraft => ({
  key,
  label: "",
  count: "1",
  length: "",
  width: "",
  height: "",
  deduct,
});

/** A dimension typed, or nothing; undefined when it isn't a number. */
function dimension(text: string): number | undefined | null {
  if (!text.trim()) {
    return null;
  }
  const value = evaluateExpression(text);
  return value !== undefined && value > 0 ? value : undefined;
}

/** The rows typed, or undefined while one is wrong. */
function readRows(drafts: readonly RowDraft[]): TakeoffRow[] | undefined {
  const rows: TakeoffRow[] = [];
  for (const draft of drafts) {
    const count = dimension(draft.count);
    const sides = [draft.length, draft.width, draft.height].map(dimension);
    if (!count || sides.includes(undefined)) {
      return undefined;
    }
    rows.push({
      label: draft.label.trim() || undefined,
      count,
      length: sides[0] ?? undefined,
      width: sides[1] ?? undefined,
      height: sides[2] ?? undefined,
      deduct: draft.deduct,
    });
  }
  return rows;
}

/**
 * The rows of an Antemăsurătoare, typed by hand: count × length × width ×
 * height each, openings as deductions, and the total they make in the
 * Articol's unit, which becomes its quantity.
 */
export function TakeoffDialog({
  target,
  onClose,
}: {
  target: Target | null;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        closeLabel={tc("close")}
        className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto"
      >
        {target && (
          <TakeoffForm
            key={target.takeoff?._id ?? `new-${target.item._id}`}
            target={target}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TakeoffForm({
  target,
  onDone,
}: {
  target: Target;
  onDone: () => void;
}) {
  const t = useScopedI18n("takeoff.editor");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const save = useMutation(api.takeoffs.takeoffs.save);
  const run = useRun();
  const { item, takeoff } = target;
  const number = (value: number | undefined) =>
    value === undefined ? "" : formatInputNumber(value, locale);
  const [title, setTitle] = useState(takeoff?.title ?? "");
  const [rows, setRows] = useState<RowDraft[]>(() =>
    takeoff && takeoff.rows.length > 0
      ? takeoff.rows.map((row, key) => ({
          key,
          label: row.label ?? "",
          count: number(row.count),
          length: number(row.length),
          width: number(row.width),
          height: number(row.height),
          deduct: row.deduct,
        }))
      : [emptyRow(0)],
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const unit = formatUnit(item.unit, locale);
  const { factor, base } = unitParts(item.unit);
  const parsed = readRows(rows);
  const total = parsed ? takeoffTotal(parsed, item.unit) : undefined;
  const allDeducted =
    parsed !== undefined && rowsTotal(parsed) === 0 && deductionsOf(parsed) > 0;

  const update = (key: number, patch: Partial<RowDraft>) =>
    setRows((list) =>
      list.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  const add = (deduct: boolean) =>
    setRows((list) => [
      ...list,
      emptyRow((list.at(-1)?.key ?? -1) + 1, deduct),
    ]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = readRows(rows);
    if (!clean || clean.length === 0) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        save({
          takeoffId: takeoff?._id,
          lineItemId: takeoff ? undefined : item._id,
          title: title.trim() || undefined,
          rows: clean,
        }),
      t("saved", {
        total: formatQuantity(takeoffTotal(clean, item.unit), locale),
        unit,
      }),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  /** The amount one row makes, as typed so far. */
  const amountOf = (draft: RowDraft) => {
    const [row] = readRows([draft]) ?? [];
    return row
      ? `${row.deduct ? "−" : ""}${formatQuantity(
          row.count * (row.length ?? 1) * (row.width ?? 1) * (row.height ?? 1),
          locale,
        )}`
      : "";
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("title", { title: item.title })}</DialogTitle>
        <DialogDescription>
          {takeoff?.rooms ? t("detached") : t("description")}
        </DialogDescription>
      </DialogHeader>
      <Field label={t("takeoffTitle")} htmlFor="takeoff-title">
        <Input
          id="takeoff-title"
          value={title}
          placeholder={t("takeoffTitlePlaceholder")}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-body">
          <thead>
            <tr className="text-label uppercase text-ink-3">
              <th className="pb-1 text-left font-medium">
                {t("columns.label")}
              </th>
              <th className="w-20 pb-1 pl-2 text-left font-medium">
                {t("columns.count")}
              </th>
              <th className="w-24 pb-1 pl-2 text-left font-medium">
                {t("columns.length")}
              </th>
              <th className="w-24 pb-1 pl-2 text-left font-medium">
                {t("columns.width")}
              </th>
              <th className="w-24 pb-1 pl-2 text-left font-medium">
                {t("columns.height")}
              </th>
              <th className="w-24 pb-1 pl-2 text-right font-medium">
                {t("columns.amount")}
              </th>
              <th className="w-14 pb-1 pl-2 text-center font-medium">
                {t("columns.deduct")}
              </th>
              <th className="w-8 pb-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} className={cn(row.deduct && "text-ink-2")}>
                <td className="py-1">
                  <Input
                    aria-label={`${t("columns.label")}, ${t("rowOf", { number: index + 1 })}`}
                    value={row.label}
                    placeholder={t("labelPlaceholder")}
                    onChange={(event) =>
                      update(row.key, { label: event.target.value })
                    }
                  />
                </td>
                <td className="py-1 pl-2">
                  <DecimalInput
                    aria-label={`${t("columns.count")}, ${t("rowOf", { number: index + 1 })}`}
                    value={row.count}
                    onChange={(event) =>
                      update(row.key, { count: event.target.value })
                    }
                  />
                </td>
                <td className="py-1 pl-2">
                  <DecimalInput
                    aria-label={`${t("columns.length")}, ${t("rowOf", { number: index + 1 })}`}
                    value={row.length}
                    onChange={(event) =>
                      update(row.key, { length: event.target.value })
                    }
                  />
                </td>
                <td className="py-1 pl-2">
                  <DecimalInput
                    aria-label={`${t("columns.width")}, ${t("rowOf", { number: index + 1 })}`}
                    value={row.width}
                    onChange={(event) =>
                      update(row.key, { width: event.target.value })
                    }
                  />
                </td>
                <td className="py-1 pl-2">
                  <DecimalInput
                    aria-label={`${t("columns.height")}, ${t("rowOf", { number: index + 1 })}`}
                    value={row.height}
                    onChange={(event) =>
                      update(row.key, { height: event.target.value })
                    }
                  />
                </td>
                <td className="py-1 pl-2 text-right tabular-nums">
                  {amountOf(row)}
                </td>
                <td className="py-1 pl-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.deduct}
                    aria-label={`${t("columns.deduct")}, ${t("rowOf", { number: index + 1 })}`}
                    onChange={(event) =>
                      update(row.key, { deduct: event.target.checked })
                    }
                    className="size-4 accent-primary"
                  />
                </td>
                <td className="py-1 pl-1 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-ink-3"
                    aria-label={t("removeRow", { number: index + 1 })}
                    disabled={rows.length === 1}
                    onClick={() =>
                      setRows((list) => list.filter((r) => r.key !== row.key))
                    }
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => add(false)}
          >
            <Plus aria-hidden />
            {t("addRow")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => add(true)}
          >
            <Plus aria-hidden />
            {t("addDeduction")}
          </Button>
        </div>
        <p
          role="status"
          className={cn(
            "m-0 text-body font-medium tabular-nums",
            error ? "text-danger" : allDeducted ? "text-warning" : "text-ink",
          )}
        >
          {error ??
            (total === undefined
              ? t("invalid")
              : allDeducted
                ? t("allDeducted")
                : factor === 1
                  ? t("total", { total: formatQuantity(total, locale), unit })
                  : t("totalScaled", {
                      rows: formatQuantity(rowsTotal(parsed ?? []), locale),
                      rowsUnit: formatUnit(base, locale),
                      total: formatQuantity(total, locale),
                      unit,
                    }))}
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving || total === undefined}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
