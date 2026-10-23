import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import Link from "next/link";
import { nav } from "@/content/site";
import { appLinks } from "@/lib/links";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-panel/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Devize, pagina de început"
          className="shrink-0"
        >
          <Wordmark />
        </Link>
        <nav
          aria-label="Navigație principală"
          className="hidden items-center gap-1 md:flex"
        >
          {nav.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <a
            href={appLinks.enter}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "hidden lg:inline-flex",
            )}
          >
            Intră în aplicație
          </a>
          <a
            href={appLinks.start}
            className={cn(buttonVariants(), "hidden sm:inline-flex")}
          >
            Începe gratuit
          </a>
          <MobileNav
            links={nav}
            enterHref={appLinks.enter}
            startHref={appLinks.start}
          />
        </div>
      </div>
    </header>
  );
}
