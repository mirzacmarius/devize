import type { ReactNode } from "react";
import { Amount } from "@/components/amount";

/** A document's total at the top of its page, the figure the page is about. */
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
          <Amount value={total} />
        </span>
        <span className="text-meta text-ink-3">lei</span>
        {note && (
          <span className="ml-4 text-meta tabular-nums text-ink-3">{note}</span>
        )}
      </p>
    </div>
  );
}
