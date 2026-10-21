"use client";

import type { api } from "@devize/backend/convex/_generated/api";
import {
  SidebarNav,
  SidebarNavItem,
  SidebarNavLabel,
} from "@devize/ui/app-shell";
import { Icons } from "@devize/ui/icons";
import { type Preloaded, usePreloadedQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { useScopedI18n } from "@/locales/client";
import { AccountMenu } from "./account-menu";
import { FirmSwitcher } from "./firm-switcher";

/**
 * What the sidebar holds: the mark, the app's areas and the signed-in user.
 * The desktop sidebar and the mobile drawer both render it.
 */
export function SidebarContent({
  preloadedUser,
  isSuperAdmin = false,
  onNavigate,
}: {
  preloadedUser: Preloaded<typeof api.users.getUser>;
  /** Shows the Admin area, for Devize staff. */
  isSuperAdmin?: boolean;
  /** Called when a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void;
}) {
  const t = useScopedI18n("navigation");
  const pathname = usePathname();
  const user = usePreloadedQuery(preloadedUser);

  if (!user) {
    return null;
  }

  const item = (href: string, Icon: LucideIcon, label: string) => (
    <SidebarNavItem
      key={href}
      asChild
      active={pathname === href || pathname.startsWith(`${href}/`)}
    >
      <Link href={href} onClick={onNavigate}>
        <Icon aria-hidden />
        {label}
      </Link>
    </SidebarNavItem>
  );

  return (
    <>
      <div className="flex px-2 pb-1">
        <Link
          href="/"
          onClick={onNavigate}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
      </div>
      <FirmSwitcher onNavigate={onNavigate} />
      <SidebarNav aria-label={t("main")}>
        <SidebarNavLabel>{t("work")}</SidebarNavLabel>
        {item("/estimates", Icons.Deviz, t("estimates"))}
        {item("/catalog", Icons.Catalog, t("catalog"))}
        {item("/clients", Icons.Clients, t("clients"))}
        {item("/rates", Icons.Rates, t("rates"))}
        <SidebarNavLabel>{t("account")}</SidebarNavLabel>
        {item("/settings", Icons.Settings, t("settings"))}
        {isSuperAdmin && item("/admin", Icons.Admin, t("admin"))}
      </SidebarNav>
      <div className="mt-auto">
        <AccountMenu
          name={user.name ?? user.email ?? ""}
          email={user.email}
          avatarUrl={user.avatarUrl}
        />
      </div>
    </>
  );
}
