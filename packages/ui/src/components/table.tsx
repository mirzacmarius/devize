import * as React from "react";

import { cn } from "../utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  // On a phone the rows become stacked blocks instead of squeezed columns:
  // each cell takes a slot of a two-column grid, `data-stack="wide"` cells take
  // the whole row. Hide what a phone doesn't need with `max-md:hidden`.
  stack?: boolean;
  // Every row has a second line: one height for such lists across the app.
  twoLine?: boolean;
  // Inside a card: it scrolls up to the card's edges, and a group row's band
  // (`band-start`, `band-end`) can run that far.
  bleed?: boolean;
}

// Numbers: put `text-right tabular-nums` on numeric heads and cells, two
// decimals, dot for thousands (39.916,16). Currency goes in the head, "(lei)".
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stack, bleed, twoLine, ...props }, ref) => (
    <div
      className={cn(
        "relative min-w-0 overflow-x-auto",
        bleed ? "-mx-[var(--card-pad)] px-[var(--card-pad)]" : "w-full",
      )}
    >
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom border-collapse text-body",
          stack && "table-stack",
          twoLine && "md:[&>tbody>tr>td]:h-[60px]",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn(className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-tile data-[state=selected]:bg-tile [thead_&]:border-b-card-border [thead_&]:hover:bg-transparent",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

// A group's heading row, in the sunken band. In a `bleed` table its first and
// last cells take `band-start` and `band-end`, and the band runs to the card's
// edges.
const TableGroupRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn("bg-sunken [&>td]:h-10 [&>td]:py-1", className)}
    {...props}
  />
));
TableGroupRow.displayName = "TableGroupRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "whitespace-nowrap px-3 pb-2.5 text-left align-bottom text-caption text-ink-3 first:pl-0 last:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "h-11 px-3 py-2 align-middle text-ink first:pl-0 last:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-meta text-ink-3", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableGroupRow,
  TableHead,
  TableHeader,
  TableRow,
};
