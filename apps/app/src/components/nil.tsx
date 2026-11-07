/**
 * Nothing in a column of numbers: a quiet dash, so nobody has to guess whether
 * a blank cell means zero. A column of words stays blank where it has nothing.
 */
export function Nil() {
  return (
    <span aria-hidden className="text-ink-3/60">
      –
    </span>
  );
}
