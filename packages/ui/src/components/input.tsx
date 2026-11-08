import * as React from "react";

import { cn } from "../utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input border-b-edge bg-field px-3 py-2 text-body text-ink transition-[border-color,box-shadow] hover:border-edge file:border-0 file:bg-transparent file:text-body file:font-medium placeholder:text-ink-3 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-ink-3 disabled:hover:border-transparent",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

// A field that narrows a list rather than asks for anything: a field like any
// other, a size under a page's own controls.
const toolbarField = "sm:h-8 sm:py-1";

export { Input, toolbarField };
