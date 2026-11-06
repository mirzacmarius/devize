import * as React from "react";

import { cn } from "../utils";

// A share of a whole is a solid bar, a count of steps is segments. Always show
// the number next to the meter, and name it in `label`.

const barTones = {
  action: "--meter",
  warning: "--warning-dot",
  danger: "--danger-solid",
};

export interface MeterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  // 0 to 100
  value: number;
  tone?: keyof typeof barTones;
  // The value in words, for screen readers: "84% gata"
  label: string;
}

const MeterBar = React.forwardRef<HTMLDivElement, MeterBarProps>(
  ({ value, tone = "action", label, className, ...props }, ref) => {
    const percent = Math.max(0, Math.min(100, value));
    return (
      <div
        ref={ref}
        role="img"
        aria-label={label}
        data-slot="meter"
        className={cn("h-1 overflow-hidden rounded-full bg-tick", className)}
        {...props}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: `hsl(var(${barTones[tone]}))`,
          }}
        />
      </div>
    );
  },
);
MeterBar.displayName = "MeterBar";

const segmentTones = {
  action: "bg-meter",
  success: "bg-success-dot",
  warning: "bg-warning-dot",
  danger: "bg-danger-solid",
  ai: "bg-ai",
};

const segmentShapes = {
  // A score out of 10 (risk, AI confidence)
  capsule: "h-2 flex-1 rounded-full",
  // A score out of 100, one block per 10
  blocks: "h-3 w-2 flex-none rounded-xs",
  // Inline, inside table cells
  mini: "h-1.5 w-3 flex-none rounded-full",
};

export interface SegmentsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: keyof typeof segmentTones;
  variant?: keyof typeof segmentShapes;
  // The value in words, for screen readers: "Risc mediu, 5 din 10"
  label: string;
}

const Segments = React.forwardRef<HTMLDivElement, SegmentsProps>(
  (
    {
      value,
      max = 10,
      tone = "action",
      variant = "capsule",
      label,
      className,
      ...props
    },
    ref,
  ) => {
    const filled = Math.round(Math.max(0, Math.min(max, value)));
    return (
      <div
        ref={ref}
        role="img"
        aria-label={label}
        className={cn(
          "flex",
          variant === "capsule" ? "gap-1" : "gap-[3px]",
          className,
        )}
        {...props}
      >
        {Array.from({ length: max }, (_, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
            key={index}
            className={cn(
              segmentShapes[variant],
              index < filled ? segmentTones[tone] : "bg-tick",
            )}
          />
        ))}
      </div>
    );
  },
);
Segments.displayName = "Segments";

export { MeterBar, Segments };
