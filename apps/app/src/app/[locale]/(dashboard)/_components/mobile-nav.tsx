"use client";

import type { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Logo } from "@devize/ui/logo";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@devize/ui/sheet";
import type { Preloaded } from "convex/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { useOpenCommandMenu } from "./command-menu";
import { SidebarContent } from "./sidebar-content";

/** Under 1024px: the mark, and a button that opens the sidebar as a drawer. */
export function MobileNav({
  preloadedUser,
  isSuperAdmin,
}: {
  preloadedUser: Preloaded<typeof api.users.getUser>;
  isSuperAdmin?: boolean;
}) {
  const t = useScopedI18n("navigation");
  const tc = useScopedI18n("commandMenu");
  const [open, setOpen] = useState(false);
  const openSearch = useOpenCommandMenu();
  return (
    // Out by the buttons' padding, so their icons sit on the page's edge.
    <div className="-mx-[11px] -mb-2 -mt-4 flex h-14 items-center gap-1 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            aria-label={t("openMenu")}
          >
            <Icons.Menu />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          closeLabel={t("closeMenu")}
          closeClassName="right-4 top-4"
          aria-describedby={undefined}
          className="gap-2 bg-shell px-3 py-3"
        >
          <SheetTitle className="sr-only">{t("main")}</SheetTitle>
          <SidebarContent
            preloadedUser={preloadedUser}
            isSuperAdmin={isSuperAdmin}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <Link
        href="/"
        className="flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo className="size-7" />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto size-10"
        aria-label={tc("title")}
        onClick={openSearch}
      >
        <Search />
      </Button>
    </div>
  );
}
