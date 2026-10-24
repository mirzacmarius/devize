/** Numbered steps in a row, joined by the tick ruler. */
export function Steps({
  steps,
}: {
  steps: ReadonlyArray<{ title: string; description: string }>;
}) {
  return (
    <ol className="m-0 grid gap-8 p-0 md:grid-cols-4 md:gap-6">
      {steps.map((step, index) => (
        <li key={step.title} className="flex list-none flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-pill text-primary-foreground tabular-nums">
              {index + 1}
            </span>
            <span aria-hidden className="tick-rule h-1.5 flex-1" />
          </div>
          <h3 className="m-0 text-title-card text-ink">{step.title}</h3>
          <p className="m-0 text-pretty text-body text-ink-2">
            {step.description}
          </p>
        </li>
      ))}
    </ol>
  );
}
