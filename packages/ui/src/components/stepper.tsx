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
  done: "bg-primary text-primary-foreground",
  failed: "bg-danger-solid text-danger-solid-foreground",
  current: "shadow-[inset_0_0_0_1.5px_hsl(var(--action))]",
  todo: "shadow-[inset_0_0_0_1.5px_hsl(var(--tick))]",
};

function tickLine(color: string): React.CSSProperties {
  return {
    backgroundImage: `repeating-linear-gradient(90deg, hsl(var(${color})) 0 1px, transparent 1px 4px)`,
  };
}

// The lifecycle of a deviz, from draft to settlement. It shows state; it is not
// navigation, so the steps are not clickable. At most 7 steps.
const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, stateLabels, className, ...props }, ref) => {
    const labels = { ...defaultStateLabels, ...stateLabels };
    return (
      <ol
        ref={ref}
        className={cn(
          "m-0 grid list-none auto-cols-[minmax(0,1fr)] grid-flow-col rounded-lg border bg-sunken px-5 py-4",
          className,
        )}
        {...props}
      >
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.state === "current" ? "step" : undefined}
            className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)] grid-rows-[24px_auto] gap-2"
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full",
                dotClass[step.state],
              )}
            >
              {step.state === "done" && (
                <Check className="size-[13px] stroke-[2.25]" aria-hidden />
              )}
              {step.state === "failed" && (
                <X className="size-[13px] stroke-[2.25]" aria-hidden />
              )}
              {step.state === "current" && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </span>
            <span
              aria-hidden
              className={cn(
                "mr-2 h-1.5 self-center",
                index === steps.length - 1 && "invisible",
              )}
              style={tickLine(step.state === "done" ? "--action" : "--tick")}
            />
            <div className="col-span-2 grid min-w-0 pr-2">
              <span
                className={cn(
                  "truncate text-body",
                  step.state === "todo" ? "text-ink-3" : "font-medium text-ink",
                )}
              >
                {step.title}
                <span className="sr-only">, {labels[step.state]}</span>
              </span>
              {step.meta && (
                <span
                  className={cn(
                    "truncate text-meta",
                    step.state === "failed" ? "text-danger" : "text-ink-3",
                  )}
                >
                  {step.meta}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    );
  },
);
Stepper.displayName = "Stepper";

export { Stepper };
