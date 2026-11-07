/**
 * Nothing in a column: a quiet dash, so nobody has to guess whether a blank cell
 * means zero or hasn't loaded.
 */
export function Nil() {
  return (
    <span aria-hidden className="text-ink-3/60">
      –
    </span>
  );
}
