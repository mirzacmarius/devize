"use client";

import {
  Card,
  CardContent,
  CardFrame,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { formatCount, formatQuantity } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { TakeoffPageData } from "./types";

/** What the Antemăsurătoare comes to: the rooms' totals and the Articole measured. */
export function SummaryCard({ data }: { data: TakeoffPageData }) {
  const t = useScopedI18n("takeoff.summary");
  const locale = useCurrentLocale();
  const sum = (pick: (room: TakeoffPageData["rooms"][number]) => number) =>
    Math.round(
      data.rooms.reduce((total, room) => total + pick(room), 0) * 100,
    ) / 100;
  const measured = data.items.filter((item) => item.takeoffs.length > 0);
  const differs = measured.filter((item) => item.differs).length;
  const rows = [
    { label: t("rooms"), value: formatCount(data.rooms.length, locale) },
    {
      label: t("floor"),
      value: `${formatQuantity(
        sum((room) => room.measures.floor),
        locale,
      )} mp`,
    },
    {
      label: t("walls"),
      value: `${formatQuantity(
        sum((room) => room.measures.walls),
        locale,
      )} mp`,
    },
    {
      label: t("perimeter"),
      value: `${formatQuantity(
        sum((room) => room.measures.perimeter),
        locale,
      )} m`,
    },
    {
      label: t("measured"),
      value: t("ofItems", {
        measured: formatCount(measured.length, locale),
        items: formatCount(data.items.length, locale),
      }),
    },
    ...(differs > 0
      ? [{ label: t("differs"), value: formatCount(differs, locale) }]
      : []),
  ];
  return (
    <CardFrame>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="m-0 grid gap-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-body text-ink-2">{row.label}</dt>
                <dd className="m-0 text-body font-medium tabular-nums text-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="m-0 text-meta text-ink-3">{t("hint")}</p>
        </CardContent>
      </Card>
    </CardFrame>
  );
}
