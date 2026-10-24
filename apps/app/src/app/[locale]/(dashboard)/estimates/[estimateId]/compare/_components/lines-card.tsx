"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { formatMoney, formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { type Comparison, type LineChange, signedMoney } from "./types";

const headClass = "pb-2 pl-3 text-right text-label uppercase text-ink-3";

/**
 * The articles added, removed and changed, each with its quantity and unit
 * price before and after and what it adds to or takes from the Deviz before
 * its Cote.
 */
export function LinesCard({ comparison }: { comparison: Comparison }) {
  const t = useScopedI18n("compare.lines");
  const { added, removed, changed } = comparison.lines;
  const groups = [
    {
      key: "changed",
      title: t("changed", { count: changed.length }),
      rows: changed,
    },
    { key: "added", title: t("added", { count: added.length }), rows: added },
    {
      key: "removed",
      title: t("removed", { count: removed.length }),
      rows: removed,
    },
  ].filter((group) => group.rows.length > 0);

  return (
    <Card>
      <CardHeader className="grid justify-items-start gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="m-0">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-6">
        {groups.length === 0 ? (
          <p className="m-0 text-body text-ink-3">{t("none")}</p>
        ) : (
          groups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`compare-${group.key}`}
              className="grid gap-2"
            >
              <h3
                id={`compare-${group.key}`}
                className="m-0 text-label uppercase text-ink-2"
              >
                {group.title}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-body">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="pb-2 text-left text-label uppercase text-ink-3"
                      >
                        {t("item")}
                      </th>
                      <th scope="col" className={headClass}>
                        {t("quantity")}
                      </th>
                      <th scope="col" className={headClass}>
                        {t("price")}
                      </th>
                      <th scope="col" className={headClass}>
                        {t("difference")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((change) => (
                      <ChangeRow key={change._id} change={change} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ChangeRow({ change }: { change: LineChange }) {
  const t = useScopedI18n("compare.lines");
  const locale = useCurrentLocale();
  const shown = change.after ?? change.before;
  if (!shown) {
    return null;
  }
  const { before, after } = change;
  const unit = formatUnit(shown.unit, locale);
  const changedField = (field: string) =>
    (change.fields as string[]).includes(field);
  const pair = (then: string | null, now: string | null) =>
    then !== null && now !== null && then !== now ? (
      <>
        <span className="text-ink-3 line-through decoration-ink-3/50">
          {then}
        </span>{" "}
        <span aria-hidden className="text-ink-3">
          →
        </span>{" "}
        {now}
      </>
    ) : (
      (now ?? then)
    );

  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3 align-top">
        <div className="grid min-w-0">
          <span className="text-ink">{shown.title}</span>
          <span className="font-mono text-code text-ink-3">
            {shown.code}
            {shown.section ? (
              <span className="font-sans"> · {shown.section}</span>
            ) : null}
          </span>
          {before && after && changedField("title") && (
            <span className="text-meta text-ink-3">
              {t("before", { title: before.title })}
            </span>
          )}
          {before && after && changedField("code") && (
            <span className="text-meta text-ink-3">
              {t("codeBefore", { code: before.code })}
            </span>
          )}
        </div>
      </td>
      <td
        className={cn(
          "whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums",
          before && after && !changedField("quantity") && "text-ink-2",
        )}
      >
        {pair(
          before
            ? `${formatQuantity(before.quantity, locale)}${
                after && changedField("unit")
                  ? ` ${formatUnit(before.unit, locale)}`
                  : ""
              }`
            : null,
          after ? formatQuantity(after.quantity, locale) : null,
        )}{" "}
        <span className="text-ink-3">{unit}</span>
      </td>
      <td
        className={cn(
          "whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums",
          before && after && !changedField("price") && "text-ink-2",
        )}
      >
        {pair(
          before ? formatMoney(before.unitPrice, locale) : null,
          after ? formatMoney(after.unitPrice, locale) : null,
        )}
      </td>
      <td className="whitespace-nowrap py-2 pl-3 text-right align-top font-medium tabular-nums text-ink">
        {signedMoney(change.difference, locale)}
      </td>
    </tr>
  );
}
