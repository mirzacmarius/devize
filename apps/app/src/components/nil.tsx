/**
 * Nothing in a text column: a quiet dash, so nobody has to guess whether a blank
 * cell hasn't loaded. A column of numbers stays blank: what's there stands out.
 */
export function Nil() {
  return (
    <span aria-hidden className="text-ink-3/60">
      –
    </span>
  );
}
