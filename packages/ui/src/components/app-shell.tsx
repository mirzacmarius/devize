import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "../utils";

// The app frame: the sidebar on `shell`, the page on a `panel` inset by 12px.
// Under 1024px the sidebar leaves the frame, so a tablet's page has the whole
// width; show its content in a Sheet opened from the page instead.
const AppShell = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "grid min-h-screen bg-shell text-ink lg:grid-cols-[theme(spacing.sidebar)_minmax(0,1fr)]",
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
      "sticky top-0 hidden h-screen flex-col gap-2 overflow-y-auto px-3 py-3 lg:flex",
      className,
    )}
    {...props}
  />
));
AppSidebar.displayName = "AppSidebar";

// The page itself. Its children stack 24px apart: PageHeader, then sections.
// On a very wide window the content stops growing and stays centred. Under
// 1024px there is no sidebar to set it apart from, so it fills the screen.
const AppMain = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn(
      "app-main grid min-w-0 grid-cols-[minmax(0,1472px)] content-start justify-center gap-4 bg-panel px-4 pb-10 pt-4 sm:gap-6 md:px-8 lg:m-2 lg:ml-0 lg:rounded-2xl lg:pt-7 lg:shadow-panel",
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
      className={cn("px-2 pb-1 pt-4 text-caption text-ink-3", className)}
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
// (`className="ml-auto"`). The current page sits on `nav-active`.
const SidebarNavItem = React.forwardRef<HTMLAnchorElement, SidebarNavItemProps>(
  ({ className, active, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        ref={ref}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-8 items-center gap-2.5 rounded-md px-2 text-body text-ink-2 transition-colors hover:bg-nav-active/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-4 [&>svg]:shrink-0",
          active && "bg-nav-active font-medium text-ink hover:bg-nav-active",
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
