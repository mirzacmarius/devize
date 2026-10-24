"use client";

import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Light or dark, the other way round from what shows. Both icons are in the
 * HTML and CSS picks one, so the server and the browser render the same thing
 * before the theme is known.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Schimbă tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        className,
      )}
    >
      <Sun aria-hidden className="dark:hidden" />
      <Moon aria-hidden className="hidden dark:block" />
    </button>
  );
}
