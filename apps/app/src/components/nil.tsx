/**
 * Nothing in a cell, or nothing to count: a quiet dash, so nobody has to guess
 * whether a blank cell hasn't loaded, and a zero doesn't read as a figure.
 */
export function Nil() {
  return (
    <span aria-hidden className="text-ink-3/60">
      –
    </span>
  );
}
