/**
 * React keys for items without an id, such as an invoice's lines or
 * payments: made from the item's content, with a counter when two items
 * read the same, so a list never falls back to array indexes.
 */
export function uniqueKeys<T>(
  items: readonly T[],
  base: (item: T) => string,
): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const key = base(item);
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? key : `${key}#${count}`;
  });
}
