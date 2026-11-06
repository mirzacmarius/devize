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
