"use client";

import { TabsNav, TabsNavLink } from "@devize/ui/tabs-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

/** The admin area's sections, one route each. */
export function AdminNav() {
  const t = useScopedI18n("admin.nav");
  const pathname = usePathname();
  const links = [
    { href: "/admin/manufacturers", label: t("manufacturers") },
    { href: "/admin/outreach", label: t("outreach") },
    { href: "/admin/settings", label: t("settings") },
  ];
  return (
    <TabsNav aria-label={t("label")}>
      {links.map((link) => (
        <TabsNavLink
          key={link.href}
          asChild
          active={pathname.startsWith(link.href)}
        >
          <Link href={link.href}>{link.label}</Link>
        </TabsNavLink>
      ))}
    </TabsNav>
  );
}
