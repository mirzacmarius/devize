import * as React from "react";

import { cn } from "../utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-20 w-full rounded-md border border-input border-b-edge bg-field px-3 py-2 text-body text-ink transition-[border-color,box-shadow] hover:border-edge placeholder:text-ink-3 focus-visible:border-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.15)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-ink-3 disabled:hover:border-transparent",
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
