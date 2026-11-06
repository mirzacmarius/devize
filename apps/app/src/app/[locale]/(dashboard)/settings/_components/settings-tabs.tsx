"use client";

import { TabsNav, TabsNavLink } from "@devize/ui/tabs-nav";
import { cn } from "@devize/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

/** The settings' sections, one route each: tabs, or a list where there's room. */
export function SettingsTabs() {
  const t = useScopedI18n("settings");
  const pathname = usePathname();
  const tabs = [
    { href: "/settings", label: t("tabs.account") },
    { href: "/settings/firm", label: t("tabs.firm") },
    { href: "/settings/members", label: t("tabs.members") },
    { href: "/settings/billing", label: t("tabs.billing") },
  ];
  return (
    <TabsNav
      aria-label={t("sections")}
      className="xl:sticky xl:top-6 xl:-ml-2.5 xl:grid xl:gap-0.5 xl:self-start xl:overflow-visible xl:border-b-0"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <TabsNavLink
            key={tab.href}
            asChild
            active={active}
            className={cn(
              "xl:mb-0 xl:h-8 xl:rounded-md xl:border-b-0 xl:px-2.5 xl:text-meta xl:hover:bg-tile",
              active && "xl:bg-nav-active xl:hover:bg-nav-active",
            )}
          >
            <Link href={tab.href}>{tab.label}</Link>
          </TabsNavLink>
        );
      })}
    </TabsNav>
  );
}
