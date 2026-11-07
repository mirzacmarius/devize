/**
 * A sum shown large: the lei at full strength and the bani a step back, so the
 * eye reads the figure at once and the exact amount is still there.
 */
export function Amount({ value }: { value: string }) {
  const match = /^(.*)([.,]\d{2})$/.exec(value);
  if (!match) {
    return value;
  }
  return (
    <>
      {match[1]}
      <span className="text-ink-3">{match[2]}</span>
    </>
  );
}

/** A sum in a line of text: the figure reads first, its unit a step back. */
export function Lei({ value }: { value: string }) {
  return (
    <>
      {value}
      {"\u00a0"}
      <span className="text-ink-3">lei</span>
    </>
  );
}
