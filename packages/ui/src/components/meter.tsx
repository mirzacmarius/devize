import * as React from "react";

import { cn } from "../utils";

// Progress and scores are made of ticks and capsules, never smooth bars or
// pies. Always show the number next to the meter, and name it in `label`.

const tickTones = {
  action: "--action",
  warning: "--warning-dot",
  danger: "--danger-solid",
};

export interface TickBarProps extends React.HTMLAttributes<HTMLDivElement> {
  // 0 to 100
  value: number;
  tone?: keyof typeof tickTones;
  thin?: boolean;
  // The value in words, for screen readers: "84% gata"
  label: string;
}

// Progress from 2px ticks at a 4px pitch: done in `action`, the rest in `tick`.
const TickBar = React.forwardRef<HTMLDivElement, TickBarProps>(
  (
    { value, tone = "action", thin, label, className, style, ...props },
    ref,
  ) => {
    const percent = Math.max(0, Math.min(100, value));
    return (
      <div
        ref={ref}
        role="img"
        aria-label={label}
        className={cn(thin ? "h-1.5" : "h-2.5", className)}
        style={{
          background: `repeating-linear-gradient(90deg, hsl(var(${tickTones[tone]})) 0 2px, transparent 2px 4px) left / ${percent}% 100% no-repeat, repeating-linear-gradient(90deg, hsl(var(--tick)) 0 2px, transparent 2px 4px)`,
          ...style,
        }}
        {...props}
      />
    );
  },
);
TickBar.displayName = "TickBar";

const segmentTones = {
  action: "bg-primary",
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

export { Segments, TickBar };
