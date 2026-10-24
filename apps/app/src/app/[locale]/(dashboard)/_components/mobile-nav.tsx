"use client";

import type { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
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
import { Wordmark } from "@/components/wordmark";
import { useScopedI18n } from "@/locales/client";
import { useOpenCommandMenu } from "./command-menu";
import { SidebarContent } from "./sidebar-content";

/** Under 768px: the mark, and a button that opens the sidebar as a drawer. */
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
    <div className="-ml-2 flex items-center gap-1 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("openMenu")}>
            <Icons.Menu />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          closeLabel={t("closeMenu")}
          aria-describedby={undefined}
          className="w-sidebar gap-3 bg-shell px-3 py-4"
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
        className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Wordmark />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto"
        aria-label={tc("title")}
        onClick={openSearch}
      >
        <Search />
      </Button>
    </div>
  );
}
