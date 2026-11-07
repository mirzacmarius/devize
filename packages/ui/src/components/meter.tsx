import * as React from "react";

import { cn } from "../utils";

// A share of a whole is a solid bar. Always show the number next to the meter,
// and name it in `label`.

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

export { MeterBar };
