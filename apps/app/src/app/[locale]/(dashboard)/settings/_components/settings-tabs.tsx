"use client";

import { TabsNav, TabsNavLink } from "@devize/ui/tabs-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

/** The settings' sections, one route each. */
export function SettingsTabs() {
  const t = useScopedI18n("settings");
  const pathname = usePathname();
  const tabs = [{ href: "/settings", label: t("general") }];
  return (
    <TabsNav aria-label={t("sections")}>
      {tabs.map((tab) => (
        <TabsNavLink key={tab.href} asChild active={pathname === tab.href}>
          <Link href={tab.href}>{tab.label}</Link>
        </TabsNavLink>
      ))}
    </TabsNav>
  );
}
