"use client";

import { cn } from "@devize/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** A header link that knows when its page, or a page under it, is open. */
export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-body text-ink-2 transition-colors hover:bg-tile hover:text-ink aria-[current=page]:text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
