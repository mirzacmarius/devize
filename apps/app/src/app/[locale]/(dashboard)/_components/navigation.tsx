"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import type { api } from "@devize/backend/convex/_generated/api";
import { Button, buttonVariants } from "@devize/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { cn } from "@devize/ui/utils";
import { type Preloaded, usePreloadedQuery } from "convex/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { useScopedI18n } from "@/locales/client";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

function Avatar({
  url,
  name,
  className,
}: {
  url: string | null | undefined;
  name: string;
  className: string;
}) {
  return url ? (
    <img
      className={cn("rounded-full object-cover", className)}
      alt={name}
      src={url}
    />
  ) : (
    <span
      className={cn(
        "rounded-full bg-gradient-to-br from-lime-400 from-10% via-cyan-300 to-blue-500",
        className,
      )}
    />
  );
}

export function Navigation({
  preloadedUser,
}: {
  preloadedUser: Preloaded<typeof api.users.getUser>;
}) {
  const t = useScopedI18n("navigation");
  const { signOut } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const user = usePreloadedQuery(preloadedUser);

  if (!user) {
    return null;
  }

  const tabs = [
    { href: "/", label: t("home"), isActive: pathname === "/" },
    {
      href: "/settings",
      label: t("settings"),
      isActive: pathname.startsWith("/settings"),
    },
  ];

  return (
    <nav className="sticky top-0 z-50 flex w-full flex-col border-b border-border bg-card px-6">
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between py-3">
        <Link href="/" className="flex h-10 items-center">
          <Wordmark />
        </Link>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 rounded-full"
              aria-label={t("accountMenu")}
            >
              <Avatar
                url={user.avatarUrl}
                name={user.name ?? user.email ?? ""}
                className="min-h-8 min-w-8"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            sideOffset={8}
            className="fixed -right-4 min-w-56 bg-card p-2"
          >
            <DropdownMenuItem className="group flex-col items-start focus:bg-transparent">
              <p className="text-sm font-medium text-primary/80 group-hover:text-primary group-focus:text-primary">
                {user.name || ""}
              </p>
              <p className="text-sm text-primary/60">{user.email}</p>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="group h-9 w-full cursor-pointer justify-between rounded-md px-2"
              onClick={() => router.push("/settings")}
            >
              <span className="text-sm text-primary/60 group-hover:text-primary group-focus:text-primary">
                {t("settings")}
              </span>
              <Settings className="h-[18px] w-[18px] stroke-[1.5px] text-primary/60 group-hover:text-primary group-focus:text-primary" />
            </DropdownMenuItem>

            <DropdownMenuItem className="group flex h-9 justify-between rounded-md px-2 hover:bg-transparent">
              <span className="w-full text-sm text-primary/60 group-hover:text-primary group-focus:text-primary">
                {t("theme")}
              </span>
              <ThemeSwitcher />
            </DropdownMenuItem>

            <DropdownMenuItem className="group flex h-9 justify-between rounded-md px-2 hover:bg-transparent">
              <span className="w-full text-sm text-primary/60 group-hover:text-primary group-focus:text-primary">
                {t("language")}
              </span>
              <LanguageSwitcher />
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-0 my-2" />

            <DropdownMenuItem
              className="group h-9 w-full cursor-pointer justify-between rounded-md px-2"
              onClick={() => signOut()}
            >
              <span className="text-sm text-primary/60 group-hover:text-primary group-focus:text-primary">
                {t("signOut")}
              </span>
              <LogOut className="h-[18px] w-[18px] stroke-[1.5px] text-primary/60 group-hover:text-primary group-focus:text-primary" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto flex w-full max-w-screen-xl items-center gap-3">
        {tabs.map((tab) => (
          <div
            key={tab.href}
            className={cn(
              "flex h-12 items-center border-b-2",
              tab.isActive ? "border-primary" : "border-transparent",
            )}
          >
            <Link
              href={tab.href}
              className={cn(
                `${buttonVariants({ variant: "ghost", size: "sm" })} text-primary/80`,
              )}
            >
              {tab.label}
            </Link>
          </div>
        ))}
      </div>
    </nav>
  );
}
