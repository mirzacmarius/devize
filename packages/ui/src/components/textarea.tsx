import * as React from "react";

import { cn } from "../utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-20 w-full rounded-md border border-input border-b-edge bg-field px-3 py-2 text-body text-ink transition-[border-color,box-shadow] hover:border-edge placeholder:text-ink-3 focus-visible:border-ink/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/10 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-ink-3 disabled:hover:border-transparent",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
