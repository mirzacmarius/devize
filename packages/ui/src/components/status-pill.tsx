import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../utils";

// The state of an object (deviz, price, invoice, sync): a dot and a word on a
// soft fill. The word carries the meaning; the dot is decorative.
const statusPillVariants = cva(
  "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-pill before:size-1.5 before:shrink-0 before:rounded-full before:content-['']",
  {
    variants: {
      tone: {
        // Not out in the world yet: Ciornă. No fill, an open dot.
        draft:
          "text-ink-2 shadow-[inset_0_0_0_1px_hsl(var(--border-control))] before:shadow-[inset_0_0_0_1.5px_hsl(var(--neutral-dot))]",
        // Out and moving, waiting on someone: Trimis clientului, Emisă
        active: "bg-muted text-ink before:bg-ink-2",
        // Finished or set aside, nothing to do: Decontat, Expirat
        neutral: "bg-muted text-ink-2 before:bg-neutral-dot",
        // A good result just reached: Acceptat de client, Sincronizat
        success: "bg-success-soft text-success before:bg-success-dot",
        // Needs attention soon: Prețuri de actualizat
        warning: "bg-warning-soft text-warning before:bg-warning-dot",
        // Blocks the next step: Verificare eșuată, Respins
        danger: "bg-danger-soft text-danger before:bg-danger-solid",
        // Proposed by AI, not applied yet
        ai: "bg-ai-soft text-ai before:bg-ai",
      },
      dot: {
        true: "",
        false: "pl-2.5 before:hidden",
      },
    },
    defaultVariants: {
      tone: "neutral",
      dot: true,
    },
  },
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {}

const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, tone, dot, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(statusPillVariants({ tone, dot }), className)}
      {...props}
    />
  ),
);
StatusPill.displayName = "StatusPill";

export { StatusPill, statusPillVariants };
