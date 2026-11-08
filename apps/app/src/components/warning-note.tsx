import { cn } from "@devize/ui/utils";
import { TriangleAlert } from "lucide-react";
import type { ComponentProps } from "react";

/** A sentence that wants attention: normal text, with amber only on its mark. */
export function WarningNote({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn("m-0 flex gap-1.5 text-meta text-ink-2", className)}
      {...props}
    >
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-3.5 shrink-0 text-warning"
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
