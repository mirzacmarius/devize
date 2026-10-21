import * as React from "react";

import { cn } from "../utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, htmlFor, children, ...props }, ref) => (
  <label
    ref={ref}
    htmlFor={htmlFor}
    className={cn(
      "text-body font-medium text-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-45",
      className,
    )}
    {...props}
  >
    {children}
  </label>
));
Label.displayName = "Label";

export { Label };
