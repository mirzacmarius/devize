"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Count } from "@devize/ui/badge";
import { TabsNav, TabsNavLink } from "@devize/ui/tabs-nav";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

/** The admin area's sections, one route each. */
export function AdminNav() {
  const t = useScopedI18n("admin.nav");
  const pathname = usePathname();
  // Claims and removal requests waiting for a decision.
  const waiting = useQuery(api.producers.admin.pendingCount) ?? 0;
  const links = [
    { href: "/admin/manufacturers", label: t("manufacturers") },
    { href: "/admin/catalog", label: t("catalog") },
    { href: "/admin/outreach", label: t("outreach") },
    { href: "/admin/review", label: t("review") },
    { href: "/admin/claims", label: t("claims"), count: waiting },
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
          <Link href={link.href}>
            {link.label}
            {link.count !== undefined && link.count > 0 && (
              <Count tone="warning" className="ml-2">
                {link.count}
              </Count>
            )}
          </Link>
        </TabsNavLink>
      ))}
    </TabsNav>
  );
}
