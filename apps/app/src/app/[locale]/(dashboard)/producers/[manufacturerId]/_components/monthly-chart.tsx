"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@devize/ui/tooltip";
import { cn } from "@devize/ui/utils";
import { formatCount, formatMonth } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

/** The top of the scale: a round number at or above the highest value. */
function scaleMax(value: number): number {
  if (value <= 4) {
    return 4;
  }
  if (value <= 10) {
    return 10;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

/**
 * One count month by month, the current month last: thin columns on a
 * hairline grid. Each column shows its value on hover and focus; the latest
 * and the highest also carry it on their cap. The page offers the same
 * numbers as a table.
 */
export function MonthlyChart({
  points,
  label,
}: {
  points: { month: string; value: number }[];
  /** What the values count: "Adăugări". */
  label: string;
}) {
  const t = useScopedI18n("producers.stats.chart");
  const locale = useCurrentLocale();
  const values = points.map((point) => point.value);
  const highest = Math.max(0, ...values);
  const max = scaleMax(highest);
  const last = points.length - 1;
  const ticks = [max, max / 2, 0];
  const top = (value: number) => `${100 - (value / max) * 100}%`;
  const monthName = (month: string, index: number) =>
    index === last
      ? t("current", { month: formatMonth(month, locale, true) })
      : formatMonth(month, locale, true);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
      <div aria-hidden className="pt-6">
        <div className="relative h-40 text-meta tabular-nums text-ink-3">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: top(tick) }}
            >
              {formatCount(tick, locale)}
            </span>
          ))}
        </div>
      </div>
      <div className="pt-6">
        <div className="relative h-40">
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ top: top(tick) }}
            />
          ))}
          <ol
            className="relative m-0 grid h-full list-none p-0"
            style={{
              gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
            }}
          >
            {points.map((point, index) => {
              const capped =
                point.value > 0 &&
                (index === last ||
                  (point.value === highest &&
                    values.indexOf(highest) === index));
              return (
                <li key={point.month} className="flex h-full justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${monthName(point.month, index)}: ${label} ${formatCount(point.value, locale)}`}
                        className="group flex h-full w-full items-end justify-center rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className="relative w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                          style={{ height: `${(point.value / max) * 100}%` }}
                        >
                          {capped && (
                            <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-meta tabular-nums text-ink-2">
                              {formatCount(point.value, locale)}
                            </span>
                          )}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="grid gap-0.5">
                      <span className="text-body font-medium tabular-nums text-ink">
                        {formatCount(point.value, locale)}
                      </span>
                      <span className="text-meta text-ink-3">
                        {label} · {monthName(point.month, index)}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <span />
      <ol
        aria-hidden
        className="m-0 grid list-none p-0 text-meta text-ink-3"
        style={{
          gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
        }}
      >
        {points.map((point, index) => (
          <li
            key={point.month}
            // On a phone every other month, ending with the current one.
            className={cn(
              "flex justify-center whitespace-nowrap",
              (last - index) % 2 === 1 && "max-sm:invisible",
            )}
          >
            {formatMonth(point.month, locale)}
          </li>
        ))}
      </ol>
    </div>
  );
}
