import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "../utils";

// Where a detail page sits: "Devize / DVZ-0142". Give the nav an aria-label
// from the app's locale; the last item is the current page.
const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn(
      "flex min-w-0 items-center gap-2 text-body text-ink-3 [&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
Breadcrumb.displayName = "Breadcrumb";

export interface BreadcrumbLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  // Render the router's link.
  asChild?: boolean;
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 whitespace-nowrap rounded-xs text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      />
    );
  },
);
BreadcrumbLink.displayName = "BreadcrumbLink";

function BreadcrumbSeparator({
  className,
  children = "/",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span aria-hidden className={cn("text-ink-3", className)} {...props}>
      {children}
    </span>
  );
}

function BreadcrumbPage({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-current="page"
      className={cn("truncate text-ink", className)}
      {...props}
    />
  );
}

export { Breadcrumb, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator };
