import { cva, type VariantProps } from "class-variance-authority";
import { TriangleAlert } from "lucide-react";
import type * as React from "react";

import { cn } from "../utils";

const tones = {
  neutral: "bg-muted text-ink-2",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  ai: "bg-ai-soft text-ai",
};

// Tag: a property of a row, after its name ("Preț vechi", "Fără normă",
// "Normă producător"). At most two per table row.
const badgeVariants = cva(
  "inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-xs px-2 align-middle text-pill [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: { tone: tones },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

// Count: how many ("Probleme 3", "Articole 24"). `plain` inside tabs and titles.
const countVariants = cva(
  "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-sm px-2 text-pill tabular-nums",
  {
    variants: {
      tone: {
        ...tones,
        plain: "h-auto min-w-0 bg-transparent px-0 text-ink-3",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface CountProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof countVariants> {}

function Count({ className, tone, ...props }: CountProps) {
  return <span className={cn(countVariants({ tone }), className)} {...props} />;
}

// Level: the severity of a risk or a problem ("Scăzut", "Mediu", "Critic").
// Only the critical level gets an icon and a border.
const levelVariants = cva(
  "inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-sm border border-transparent px-3 text-pill [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: tones.neutral,
        success: tones.success,
        warning: tones.warning,
        danger: `${tones.danger} border-danger-border`,
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface LevelProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof levelVariants> {}

function Level({ className, tone, children, ...props }: LevelProps) {
  return (
    <span className={cn(levelVariants({ tone }), className)} {...props}>
      {tone === "danger" && <TriangleAlert aria-hidden />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants, Count, countVariants, Level, levelVariants };
