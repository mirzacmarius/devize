"use client";

import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

export function SettingsNav() {
  const t = useScopedI18n("settings");
  const pathname = usePathname();
  const links = [
    {
      href: "/settings",
      label: t("general"),
      isActive: pathname === "/settings",
    },
  ];
  return (
    <div className="hidden w-full max-w-64 flex-col gap-0.5 lg:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            link.isActive && "bg-primary/5",
            "justify-start rounded-md",
          )}
        >
          <span
            className={cn(
              "text-sm text-primary/80",
              link.isActive && "font-medium text-primary",
            )}
          >
            {link.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
