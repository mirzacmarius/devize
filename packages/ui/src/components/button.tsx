import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium ring-offset-background transition-[background-color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The next action on the screen: one per view.
        default: "bg-primary text-primary-foreground hover:opacity-90",
        // Actions next to the primary one.
        outline:
          "border border-input bg-card text-ink shadow-raised hover:bg-tile",
        // Tonal: filled secondary action inside a card ("Adaugă articol").
        secondary: "bg-secondary text-secondary-foreground hover:bg-tile",
        // Applies an AI proposal ("Aplică sugestiile"). AI content only.
        ai: "border border-ai-border bg-card text-ai hover:bg-ai-soft",
        // No red filled buttons: destructive actions are soft and confirmed.
        destructive: "bg-danger-soft text-danger hover:opacity-90",
        ghost: "text-ink-2 hover:bg-tile hover:text-ink",
        link: "gap-1 text-ink underline-offset-[3px] hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-7 px-3",
        lg: "h-10 px-5",
        icon: "h-9 w-9 [&_svg]:size-[18px]",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
