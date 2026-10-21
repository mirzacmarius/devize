import { Input, type InputProps } from "@devize/ui/input";
import { cn } from "@devize/ui/utils";

/**
 * A text field for a number typed the Romanian way ("42,5") or the English
 * way ("42.5"), with an optional unit after it ("%", "lei/oră"). Read the
 * value with parseDecimal().
 */
export function DecimalInput({
  suffix,
  className,
  ...props
}: Omit<InputProps, "type" | "inputMode"> & { suffix?: string }) {
  return (
    <div className="relative min-w-0">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("text-right tabular-nums", suffix && "pr-14", className)}
        {...props}
      />
      {suffix && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-meta text-ink-3"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
