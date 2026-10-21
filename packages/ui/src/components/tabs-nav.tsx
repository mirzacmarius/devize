import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "../utils";

// The sections of a page when each is its own route: a deviz's "Prezentare",
// "Articole", "Probleme"; the settings' "General". 3–7 tabs of 1–3 words, in
// the same order everywhere. Give the nav an aria-label from the app's locale.
// To filter one list, use a segmented control instead.
const TabsNav = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn(
      "flex gap-6 overflow-x-auto border-b [scrollbar-width:none]",
      className,
    )}
    {...props}
  />
));
TabsNav.displayName = "TabsNav";

export interface TabsNavLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  // Render the router's link.
  asChild?: boolean;
}

// One tab: an optional icon, the name and an optional plain Count
// ("Articole 24"). The current one is underlined in `action`.
const TabsNavLink = React.forwardRef<HTMLAnchorElement, TabsNavLinkProps>(
  ({ className, active, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        ref={ref}
        aria-current={active ? "page" : undefined}
        className={cn(
          "-mb-px inline-flex items-center gap-2 whitespace-nowrap rounded-t-xs border-b-2 border-transparent py-3 text-body text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&>svg]:size-[18px] [&>svg]:shrink-0",
          active && "border-primary font-medium text-ink",
          className,
        )}
        {...props}
      />
    );
  },
);
TabsNavLink.displayName = "TabsNavLink";

export { TabsNav, TabsNavLink };
