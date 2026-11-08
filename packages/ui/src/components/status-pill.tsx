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
  "inline-flex items-baseline gap-1.5 whitespace-nowrap text-meta before:size-2 before:shrink-0 before:self-center before:rounded-full before:content-['']",
  {
    variants: {
      tone: {
        // Not out in the world yet: Ciornă. An open dot.
        draft:
          "text-ink-3 before:shadow-[inset_0_0_0_1.5px_hsl(var(--active-dot))]",
        // Out and moving, waiting on someone: Trimis clientului, Emisă
        active: "text-ink-2 before:bg-active-dot",
        // Finished or set aside, nothing to do: Decontat, Expirat
        neutral: "text-ink-2 before:bg-neutral-dot",
        // A good result just reached: Acceptat de client, Sincronizat
        success: "text-ink-2 before:bg-success-dot",
        // Needs attention soon: Prețuri de actualizat
        warning: "text-warning before:bg-warning-dot",
        // Blocks the next step, or is overdue: Verificare eșuată, Termen depășit
        danger: "text-danger before:bg-current",
        // A final no that asks nothing more: Respins, Refuzată, Anulată. The
        // dot says how it ended; the word stays as quiet as Acceptat's.
        declined: "text-ink-2 before:bg-danger",
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
      data-slot="status-pill"
      className={cn(statusPillVariants({ tone, dot }), className)}
      {...props}
    />
  ),
);
StatusPill.displayName = "StatusPill";

export { StatusPill, statusPillVariants };
