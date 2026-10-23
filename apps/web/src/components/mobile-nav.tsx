"use client";

import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

interface MobileNavProps {
  links: ReadonlyArray<{ href: string; label: string }>;
  enterHref: string;
  startHref: string;
}

/** The header's menu under the md breakpoint. It closes when a page opens. */
export function MobileNav({ links, enterHref, startHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Închide meniul" : "Deschide meniul"}
        onClick={() => setOpen((value) => !value)}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-panel shadow-panel"
      >
        <nav
          aria-label="Navigație principală"
          className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="rounded-md px-3 py-2.5 text-body-lg text-ink-2 hover:bg-tile hover:text-ink aria-[current=page]:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
            <a
              href={startHref}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Începe gratuit
            </a>
            <a
              href={enterHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full",
              )}
            >
              Intră în aplicație
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
