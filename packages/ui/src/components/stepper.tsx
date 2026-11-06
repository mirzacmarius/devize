import { Check, X } from "lucide-react";
import * as React from "react";

import { cn } from "../utils";

export type StepState = "done" | "failed" | "current" | "todo";

export interface Step {
  id: string;
  title: React.ReactNode;
  // A date for done steps ("14 oct."), the reason for a failed one
  // ("2 probleme · 10:42"), a deadline for a future one ("Termen 30 nov.").
  meta?: React.ReactNode;
  state: StepState;
}

export interface StepperProps extends React.OlHTMLAttributes<HTMLOListElement> {
  steps: Step[];
  // How screen readers name each state, from the app's locale.
  stateLabels?: Partial<Record<StepState, string>>;
}

const defaultStateLabels: Record<StepState, string> = {
  done: "încheiat",
  failed: "eșuat",
  current: "în curs",
  todo: "urmează",
};

const dotClass: Record<StepState, string> = {
  done: "bg-ink-2 text-panel",
  failed: "bg-danger-solid text-danger-solid-foreground",
  current: "shadow-[inset_0_0_0_1.5px_hsl(var(--ink))]",
  todo: "shadow-[inset_0_0_0_1.5px_hsl(var(--tick))]",
};

// The lifecycle of a deviz, from draft to settlement, as one quiet line. It
// shows state; it is not navigation, so the steps are not clickable. At most 7.
const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, stateLabels, className, ...props }, ref) => {
    const labels = { ...defaultStateLabels, ...stateLabels };
    return (
      <ol
        ref={ref}
        className={cn("m-0 flex min-w-0 list-none gap-2 p-0", className)}
        {...props}
      >
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-[1_1_auto] items-center gap-2 last:flex-none"
          >
            <span
              className={cn(
                "grid size-[18px] shrink-0 place-items-center rounded-full",
                dotClass[step.state],
              )}
            >
              {step.state === "done" && (
                <Check className="size-[11px] stroke-[2.5]" aria-hidden />
              )}
              {step.state === "failed" && (
                <X className="size-[11px] stroke-[2.5]" aria-hidden />
              )}
              {step.state === "current" && (
                <span className="size-1.5 rounded-full bg-ink" />
              )}
            </span>
            <span className="grid min-w-0 sm:flex sm:items-baseline sm:gap-1.5 sm:whitespace-nowrap">
              <span
                className={cn(
                  "text-meta",
                  step.state === "todo" ? "text-ink-3" : "font-medium text-ink",
                )}
              >
                {step.title}
                <span className="sr-only">, {labels[step.state]}</span>
              </span>
              {step.meta && (
                <span
                  className={cn(
                    "text-meta tabular-nums",
                    step.state === "failed" ? "text-danger" : "text-ink-3",
                  )}
                >
                  {step.meta}
                </span>
              )}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mx-1 h-px min-w-3 flex-1",
                  step.state === "done" ? "bg-ink-3/70" : "bg-tick",
                )}
              />
            )}
          </li>
        ))}
      </ol>
    );
  },
);
Stepper.displayName = "Stepper";

export { Stepper };
