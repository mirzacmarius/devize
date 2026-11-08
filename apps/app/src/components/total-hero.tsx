import type { ReactNode } from "react";

/**
 * A document's total at the top of its page, the figure the page is about:
 * whole and in ink, as it's agreed.
 */
export function TotalHero({
  label,
  total,
  note,
}: {
  label: ReactNode;
  total: string;
  note?: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-y-0.5">
      <p className="m-0 text-meta text-ink-2">{label}</p>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2">
        <span className="text-hero tabular-nums text-ink max-sm:text-lead max-sm:leading-8">
          {total}
        </span>
        <span className="text-meta text-ink-3">lei</span>
        {note && (
          <span className="ml-4 text-meta tabular-nums text-ink-3">{note}</span>
        )}
      </p>
    </div>
  );
}
