"use client";

import { cn } from "@devize/ui/utils";
import type { HTMLAttributes, ReactNode } from "react";
import { useScopedI18n } from "@/locales/client";

/** Facts about something, each a row of the same kind: a name and its value. */
export function FactList({
  className,
  ...props
}: HTMLAttributes<HTMLDListElement>) {
  return <dl className={cn("m-0 grid", className)} {...props} />;
}

export function Fact({
  label,
  title,
  children,
}: {
  label: ReactNode;
  // The whole fact, where the row only has room for its short form.
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      title={title}
      className="flex min-w-0 items-baseline justify-between gap-4 py-1"
    >
      <dt className="min-w-0 text-meta text-ink-3">{label}</dt>
      <dd className="m-0 min-w-0 text-right text-body tabular-nums text-ink [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

/**
 * Facts with their values left-aligned in one column, for text that runs long,
 * such as an address. What has no value says so.
 */
export function FactRows({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  const tc = useScopedI18n("common");
  return (
    <dl className="m-0 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-meta leading-5 text-ink-3">{row.label}</dt>
          <dd className="m-0 min-w-0 text-body tabular-nums text-ink [overflow-wrap:anywhere] max-sm:mb-1">
            {row.value || <span className="text-ink-3">{tc("notSet")}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
