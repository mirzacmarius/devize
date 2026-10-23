const forms = [
  "Formularul de ofertă",
  "DG",
  "DO",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
] as const;

/** The official forms Devize draws, as a row of codes. */
export function FormsStrip() {
  return (
    <ul
      className="m-0 flex flex-wrap gap-2 p-0"
      aria-label="Formulare oficiale"
    >
      {forms.map((form) => (
        <li
          key={form}
          className="list-none rounded-sm bg-muted px-2.5 py-1 font-mono text-code text-ink-2"
        >
          {form}
        </li>
      ))}
    </ul>
  );
}
