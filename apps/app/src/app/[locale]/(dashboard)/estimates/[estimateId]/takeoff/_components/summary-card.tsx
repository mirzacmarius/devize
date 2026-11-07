"use client";

import { MeterBar } from "@devize/ui/meter";
import { Figure, FigureStrip } from "@/components/figure-strip";
import { formatCount, formatPercent, formatQuantity } from "@/lib/format";
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
  const share =
    data.items.length > 0
      ? Math.round((measured.length / data.items.length) * 100)
      : 0;
  const shareLabel = t("measuredShare", {
    percent: formatPercent(share, locale),
  });
  const measurable = data.estimate.locked
    ? 0
    : data.items.length - measured.length;
  return (
    <FigureStrip compact>
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
        beside={
          <MeterBar
            ruled
            className="ml-2.5 min-w-20 flex-1 self-center max-sm:hidden"
            value={share}
            tone="action"
            label={shareLabel}
          />
        }
        note={
          <>
            {/* Nothing to measure on a Deviz that has left. */}
            {measurable > 0 && (
              <a
                href="#items"
                className="rounded-xs underline decoration-ink-3/50 underline-offset-[4px] hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("unmeasured", { left: formatCount(measurable, locale) })}
              </a>
            )}
            {measurable > 0 && differs > 0 && " · "}
            {differs > 0 && `${t("differs")}: ${formatCount(differs, locale)}`}
          </>
        }
      >
        <MeterBar
          ruled
          className="mt-1.5 sm:hidden"
          value={share}
          tone="action"
          label={shareLabel}
        />
      </Figure>
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
