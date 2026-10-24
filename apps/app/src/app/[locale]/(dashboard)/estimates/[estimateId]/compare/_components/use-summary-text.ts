"use client";

import {
  estimateCode,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { type Comparison, signedMoney } from "./types";

const MARKUPS = ["cam", "indirect", "profit", "vat"] as const;

/**
 * What changed, as plain text to paste into an email to the client: the
 * total before and after, then the articles added, removed and changed.
 */
export function useSummaryText(
  comparison: Comparison | undefined,
): string | null {
  const t = useScopedI18n("compare.text");
  const tMarkups = useScopedI18n("markups");
  const locale = useCurrentLocale();
  if (!comparison) {
    return null;
  }
  const { before, after, lines, number } = comparison;
  const money = (value: number) => formatMoney(value, locale);
  const signed = (value: number) => signedMoney(value, locale);
  const parts: string[] = [
    t("heading", {
      code: estimateCode(number),
      title: after.title,
      before: estimateCode(number, before.revision),
      after: estimateCode(number, after.revision),
    }),
    t("total", {
      before: money(before.totals.total),
      after: money(after.totals.total),
      difference: signed(after.totals.total - before.totals.total),
    }),
  ];

  const simple = (heading: string, rows: typeof lines.added) => {
    if (rows.length === 0) {
      return;
    }
    parts.push("", heading);
    for (const row of rows) {
      const state = row.after ?? row.before;
      if (state) {
        parts.push(
          t("line", {
            title: state.title,
            quantity: formatQuantity(state.quantity, locale),
            unit: formatUnit(state.unit, locale),
            difference: signed(row.difference),
          }),
        );
      }
    }
  };
  simple(t("added"), lines.added);
  simple(t("removed"), lines.removed);

  if (lines.changed.length > 0) {
    parts.push("", t("changed"));
    for (const row of lines.changed) {
      const { before: then, after: now } = row;
      if (!then || !now) {
        continue;
      }
      const unit = formatUnit(now.unit, locale);
      const changes: string[] = [];
      const unitChanged = row.fields.includes("unit");
      if (row.fields.includes("quantity") || unitChanged) {
        // A custom article's unit can change too: "10 m → 12 mp".
        const was = formatQuantity(then.quantity, locale);
        changes.push(
          t("quantity", {
            before: unitChanged
              ? `${was} ${formatUnit(then.unit, locale)}`
              : was,
            after: formatQuantity(now.quantity, locale),
            unit,
          }),
        );
      }
      if (row.fields.includes("price")) {
        changes.push(
          t("price", {
            before: money(then.unitPrice),
            after: money(now.unitPrice),
            unit,
          }),
        );
      }
      if (row.fields.includes("title")) {
        changes.push(t("renamed", { title: then.title }));
      }
      if (row.fields.includes("code")) {
        changes.push(t("recoded", { code: then.code }));
      }
      parts.push(
        t("changedLine", {
          title: now.title,
          changes: changes.join(", "),
          difference: signed(row.difference),
        }),
      );
    }
  }

  const markups = MARKUPS.filter(
    (key) => before.markups[key] !== after.markups[key],
  );
  if (markups.length > 0) {
    parts.push(
      "",
      t("markups", {
        changes: markups
          .map(
            (key) =>
              `${tMarkups(`${key}.label`)} ${formatPercent(before.markups[key], locale)} → ${formatPercent(after.markups[key], locale)}`,
          )
          .join(", "),
      }),
    );
  }
  if (lines.added.length + lines.removed.length + lines.changed.length === 0) {
    parts.push("", t("same"));
  } else {
    parts.push("", t("note"));
  }
  return parts.join("\n");
}
