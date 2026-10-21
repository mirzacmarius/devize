import { cn } from "@devize/ui/utils";

/** The product name as a logo. A placeholder until the design system's logo. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "select-none text-lg font-semibold tracking-tight text-primary",
        className,
      )}
    >
      Devize
    </span>
  );
}
