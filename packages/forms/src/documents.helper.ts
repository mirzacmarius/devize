import type { Block, FormDocument, Row, Table } from "./model";

// Reading built documents back in tests.

export function tablesOf(document: FormDocument | undefined): Table[] {
  return (document?.blocks ?? []).filter(
    (block): block is Table => block.type === "table",
  );
}

/** The last row with a cell saying `label`: the closing, not a line item's. */
export function rowLabelled(
  table: Table | undefined,
  label: string,
): Row | undefined {
  return [...(table?.rows ?? [])]
    .reverse()
    .find((row) => row.cells.some((cell) => cell.text === label));
}

/** The amounts a row prints, left to right. */
export function amountsOf(row: Row | undefined): number[] {
  return (row?.cells ?? []).flatMap((cell) =>
    cell.value === undefined ? [] : [cell.value],
  );
}

export function fields(document: FormDocument | undefined) {
  const block = document?.blocks.find(
    (item): item is Extract<Block, { type: "fields" }> =>
      item.type === "fields",
  );
  return Object.fromEntries(
    (block?.items ?? []).map((item) => [item.label, item.value]),
  );
}
