"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@devize/ui/avatar";
import { Button } from "@devize/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { initials } from "@/lib/initials";
import { useScopedI18n } from "@/locales/client";
import { LanguageMenu } from "./language-menu";
import { ThemeMenu } from "./theme-menu";

/** The signed-in user at the foot of the sidebar, with the account menu. */
export function AccountMenu({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string | undefined;
  avatarUrl: string | null | undefined;
}) {
  const t = useScopedI18n("navigation");
  const { signOut } = useAuthActions();
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 pl-2 pt-2">
      <Avatar>
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="grid min-w-0">
        <span className="truncate text-body font-medium text-ink">{name}</span>
        {email && email !== name && (
          <span className="truncate text-meta text-ink-3">{email}</span>
        )}
      </div>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("accountMenu")}>
            <Icons.More />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-56"
        >
          <ThemeMenu />
          <LanguageMenu />
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}>
            <Icons.SignOut aria-hidden />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
