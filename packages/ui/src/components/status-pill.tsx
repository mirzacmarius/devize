import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../utils";

// The state of an object (deviz, price, invoice, sync): a dot and a word, the
// same form in every list, with colour only for a state that means something
// (good, needs attention, blocks, AI). The word carries the meaning; the dot is
// decorative.
const statusPillVariants = cva(
  // An empty ::before would set the baseline of the row it stands in, so the
  // dot is centred on its own and the text keeps the line it shares.
  "inline-flex items-baseline gap-1.5 whitespace-nowrap text-meta before:size-1.5 before:shrink-0 before:self-center before:rounded-full before:content-['']",
  {
    variants: {
      tone: {
        // Not out in the world yet: Ciornă. An open dot.
        draft:
          "text-ink-2 before:shadow-[inset_0_0_0_1.5px_hsl(var(--neutral-dot))]",
        // Out and moving, waiting on someone: Trimis clientului, Emisă
        active: "text-ink-2 before:bg-ink-2",
        // Finished or set aside, nothing to do: Decontat, Expirat
        neutral: "text-ink-2 before:bg-neutral-dot",
        // A good result just reached: Acceptat de client, Sincronizat
        success: "text-ink-2 before:bg-success-dot",
        // Needs attention soon: Prețuri de actualizat
        warning: "text-warning before:bg-warning-dot",
        // Blocks the next step: Verificare eșuată, Respins
        danger: "text-danger before:bg-danger-solid",
        // Proposed by AI, not applied yet
        ai: "text-ai before:bg-ai",
      },
      dot: {
        true: "",
        false: "before:hidden",
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
