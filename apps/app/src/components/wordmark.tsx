import { Logo } from "@devize/ui/logo";
import { cn } from "@devize/ui/utils";

/**
 * The Devize mark and name. Size it with a text size class: the mark follows
 * the text.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-[0.45em] text-lg font-semibold tracking-[-0.01em] text-ink",
        className,
      )}
    >
      <Logo aria-hidden className="size-[1.55em] shrink-0" />
      Devize
    </span>
  );
}
