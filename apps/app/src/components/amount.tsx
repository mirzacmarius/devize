/**
 * A sum in a line of text: the figure reads first, its unit a step back. Every
 * sum is whole and in ink, a working page's lead as a document's total: the
 * bani are part of the figure.
 */
export function Lei({ value }: { value: string }) {
  return (
    <>
      {value}
      {"\u00a0"}
      <span className="text-ink-3">lei</span>
    </>
  );
}
