import * as React from "react";

import { cn } from "../utils";

// A Devize card: `card` surface, `card-border`, radius-lg, 20px padding.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "min-w-0 rounded-lg border border-card-border bg-card text-card-foreground shadow-card",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

// The framed card: a `sunken` rim around one card, for the page's key summary
// ("Gata de trimis 84%", "Verificări"). At most one per column.
const CardFrame = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "min-w-0 rounded-xl border border-border bg-sunken p-1",
      className,
    )}
    {...props}
  />
));
CardFrame.displayName = "CardFrame";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex min-w-0 items-center justify-between gap-3 p-5 pb-4",
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
  <p ref={ref} className={cn("text-meta text-ink-3", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("grid gap-4 px-5 pb-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3 px-5 pb-5", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// The tick ruler between a card's header and a list or table body.
function TickRule({
  className,
  ...props
}: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("tick-rule m-0 border-0", className)} {...props} />;
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
