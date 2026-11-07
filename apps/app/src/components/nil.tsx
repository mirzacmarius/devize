/**
 * A cell with nothing to show where a number or a state could be: a quiet dash,
 * so the column reads as complete rather than unfinished.
 */
export function Nil() {
  return (
    <span aria-hidden className="text-ink-3/60">
      –
    </span>
  );
}
