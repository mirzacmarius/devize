import type { ReactNode } from "react";
import { Amount } from "@/components/amount";

/** A rail section's one figure: the number and, beside it, what it counts. */
export function RailFigure({
  value,
  unit,
}: {
  value: string;
  unit: ReactNode;
}) {
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-figure tabular-nums text-ink">
        <Amount value={value} />
      </span>
      <span className="text-meta text-ink-3">{unit}</span>
    </p>
  );
}
