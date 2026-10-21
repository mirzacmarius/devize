import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "../utils";

// The app frame: the sidebar on `shell`, the page on a `panel` inset by 12px.
// Under 768px the sidebar leaves the frame; show its content in a Sheet
// opened from the page instead.
const AppShell = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "grid min-h-screen bg-shell text-ink md:grid-cols-[theme(spacing.sidebar)_minmax(0,1fr)]",
      className,
    )}
    {...props}
  />
));
AppShell.displayName = "AppShell";

// The sidebar column. It stays in place while the page scrolls, and scrolls
// on its own when the navigation is taller than the window.
const AppSidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <aside
    ref={ref}
    className={cn(
      "sticky top-0 hidden h-screen flex-col gap-3 overflow-y-auto px-3 py-4 md:flex",
      className,
    )}
    {...props}
  />
));
AppSidebar.displayName = "AppSidebar";

// The page itself. Its children stack 24px apart: PageHeader, then sections.
const AppMain = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn(
      "m-3 grid min-w-0 content-start gap-6 rounded-2xl bg-panel px-4 pb-8 pt-4 shadow-panel md:ml-0 md:px-8 md:pt-6",
      className,
    )}
    {...props}
  />
));
AppMain.displayName = "AppMain";

const SidebarNav = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav ref={ref} className={cn("grid gap-0.5", className)} {...props} />
));
SidebarNav.displayName = "SidebarNav";

// A group title in the sidebar: "Lucru", "Cont".
function SidebarNavLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "px-3 pb-2 pt-4 text-label uppercase text-ink-3",
        className,
      )}
      {...props}
    />
  );
}

export interface SidebarNavItemProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  // Render the router's link as the item.
  asChild?: boolean;
}

// One destination: an icon, the name and an optional Count after it
// (`className="ml-auto"`). The current page is raised on `selected`.
const SidebarNavItem = React.forwardRef<HTMLAnchorElement, SidebarNavItemProps>(
  ({ className, active, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        ref={ref}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 items-center gap-3 rounded-md px-3 text-body-lg text-ink-2 transition-colors hover:bg-tile hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-[18px] [&>svg]:shrink-0",
          active && "bg-selected text-ink shadow-raised hover:bg-selected",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarNavItem.displayName = "SidebarNavItem";

export {
  AppMain,
  AppShell,
  AppSidebar,
  SidebarNav,
  SidebarNavItem,
  SidebarNavLabel,
};
