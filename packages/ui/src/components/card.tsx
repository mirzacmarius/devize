import * as React from "react";

import { cn } from "../utils";

// A Devize card: `card` surface, one `card-border` hairline, radius-lg, 20px padding.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card"
    className={cn(
      "min-w-0 rounded-lg border border-card-border bg-card text-card-foreground shadow-card",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

// The page's key summary ("Gata de trimis 84%", "Verificări"). It holds one card
// and adds no outline of its own: one edge per card, everywhere.
const CardFrame = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("min-w-0", className)} {...props} />
));
CardFrame.displayName = "CardFrame";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn(
      // The height a small button needs, so titles line up with or without one.
      "flex min-h-[3.875rem] min-w-0 items-center justify-between gap-3 px-4 pb-3.5 pt-4 sm:px-5",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("m-0 text-title-card text-ink", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "max-w-[72ch] text-meta text-ink-3 [text-wrap:pretty]",
      className,
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={cn("grid gap-4 px-4 pb-5 sm:px-5", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn("flex items-center gap-3 px-4 pb-5 sm:px-5", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// The hairline between a card's header and its list or table body, in line
// with the rows under it.
function TickRule({
  className,
  ...props
}: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={cn("m-0 mx-5 h-px border-0 bg-border", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardFrame,
  CardHeader,
  CardTitle,
  TickRule,
};
