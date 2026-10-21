"use client";

import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

export function AdminNav() {
  const t = useScopedI18n("admin.nav");
  const pathname = usePathname();
  const links = [
    { href: "/admin/manufacturers", label: t("manufacturers") },
    { href: "/admin/outreach", label: t("outreach") },
    { href: "/admin/settings", label: t("settings") },
  ];
  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            pathname.startsWith(link.href)
              ? "bg-primary/5 text-primary"
              : "text-primary/60",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
