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
      "text-body font-normal text-ink-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-45",
      className,
    )}
    {...props}
  >
    {children}
  </label>
));
Label.displayName = "Label";

export { Label };
