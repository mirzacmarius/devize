"use client";

import { Lock } from "lucide-react";
import { Figure, FigureStrip } from "@/components/figure-strip";
import { formatCount, formatQuantity } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { TakeoffPageData } from "./types";

/** What the Antemăsurătoare comes to: the rooms' totals and the Articole measured. */
export function SummaryCard({ data }: { data: TakeoffPageData }) {
  const t = useScopedI18n("takeoff.summary");
  const tTakeoff = useScopedI18n("takeoff");
  const locale = useCurrentLocale();
  const sum = (pick: (room: TakeoffPageData["rooms"][number]) => number) =>
    Math.round(
      data.rooms.reduce((total, room) => total + pick(room), 0) * 100,
    ) / 100;
  const measured = data.items.filter((item) => item.takeoffs.length > 0);
  const differs = measured.filter((item) => item.differs).length;
  const unmeasured = data.items.length - measured.length;
  return (
    <FigureStrip
      hint={
        data.estimate.locked && (
          <span className="flex items-center gap-1.5">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {tTakeoff("locked")}
          </span>
        )
      }
    >
      <Figure
        lead
        label={t("measured")}
        value={
          <>
            {formatCount(measured.length, locale)}
            <span className="text-ink-3">
              {" "}
              {t("ofItems", {
                items: formatCount(data.items.length, locale),
              })}
            </span>
          </>
        }
        note={
          <>
            {unmeasured > 0 && (
              <a
                href="#items"
                className="rounded-xs underline decoration-ink-3/50 underline-offset-[3px] hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("unmeasured", { left: formatCount(unmeasured, locale) })}
              </a>
            )}
            {unmeasured > 0 && differs > 0 && " · "}
            {differs > 0 && `${t("differs")}: ${formatCount(differs, locale)}`}
          </>
        }
      />
      <Figure
        label={t("rooms")}
        value={formatCount(data.rooms.length, locale)}
      />
      <Figure
        label={t("floor")}
        value={formatQuantity(
          sum((room) => room.measures.floor),
          locale,
        )}
        unit="mp"
      />
      <Figure
        label={t("walls")}
        value={formatQuantity(
          sum((room) => room.measures.walls),
          locale,
        )}
        unit="mp"
      />
      <Figure
        label={t("perimeter")}
        value={formatQuantity(
          sum((room) => room.measures.perimeter),
          locale,
        )}
        unit="m"
      />
    </FigureStrip>
  );
}
