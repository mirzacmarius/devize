import { Check, X } from "lucide-react";
import * as React from "react";

import { cn } from "../utils";

export type StepState = "done" | "success" | "failed" | "current" | "todo";

export interface Step {
  id: string;
  title: React.ReactNode;
  // A date for done steps ("14 oct."), the reason for a failed one
  // ("2 probleme · 10:42"), a deadline for a future one ("Termen 30 nov.").
  meta?: React.ReactNode;
  state: StepState;
  // What marks the step it's at, when that's more than the dot.
  mark?: React.ReactNode;
}

export interface StepperProps extends React.OlHTMLAttributes<HTMLOListElement> {
  steps: Step[];
  // How screen readers name each state, from the app's locale.
  stateLabels?: Partial<Record<StepState, string>>;
}

const defaultStateLabels: Record<StepState, string> = {
  done: "încheiat",
  success: "încheiat",
  failed: "eșuat",
  current: "în curs",
  todo: "urmează",
};

const titleClass: Record<StepState, string> = {
  done: "text-ink-2",
  success: "font-medium text-ink",
  failed: "font-medium text-danger",
  current: "text-ink-2",
  todo: "text-ink-3",
};

// The lifecycle of a deviz, from draft to settlement, as one quiet line that
// takes the size of the line it stands in, and its baseline. It shows state; it
// is not navigation, so the steps are not clickable. At most 7.
const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, stateLabels, className, ...props }, ref) => {
    const labels = { ...defaultStateLabels, ...stateLabels };
    return (
      <ol
        ref={ref}
        className={cn(
          "m-0 inline-flex min-w-0 list-none flex-wrap items-baseline gap-x-2.5 gap-y-1 p-0",
          className,
        )}
        {...props}
      >
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex min-w-0 items-baseline gap-1.5"
          >
            {/* What's still to come is only its name. */}
            {step.state !== "todo" && (
              <span
                aria-hidden
                // Where it's at, the mark a status has in the lists.
                className={cn(
                  "grid shrink-0 place-items-center self-center",
                  step.state === "current" ? "size-[7px]" : "size-3.5",
                )}
              >
                {step.state === "done" && (
                  <Check className="size-3.5 text-ink-3" />
                )}
                {step.state === "success" && (
                  <Check className="size-3.5 text-success" />
                )}
                {step.state === "failed" && (
                  <X className="size-3.5 text-danger" />
                )}
                {step.state === "current" &&
                  (step.mark ?? (
                    <span className="size-[7px] rounded-full bg-active-dot" />
                  ))}
              </span>
            )}
            <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
              <span className={titleClass[step.state]}>
                {step.title}
                <span className="sr-only">, {labels[step.state]}</span>
              </span>
              {step.meta && (
                <span className="tabular-nums text-ink-2">{step.meta}</span>
              )}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden className="ml-1 h-px w-3 self-center bg-tick" />
            )}
          </li>
        ))}
      </ol>
    );
  },
);
Stepper.displayName = "Stepper";

export { Stepper };
