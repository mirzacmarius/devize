"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FirmForm } from "@/components/firm-form";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { initials } from "@/lib/initials";
import { useScopedI18n } from "@/locales/client";

/**
 * The Firmă the user works in, raised on the shell, with the others, the
 * invitations from other firms and "Firmă nouă" in its menu.
 */
export function FirmSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const t = useScopedI18n("firm");
  const tInvite = useScopedI18n("invite");
  const { firm, firms } = useFirm();
  const invitations = useQuery(api.accounts.invitations.listMine) ?? [];
  const setActive = useMutation(api.accounts.organizations.setActive);
  const run = useRun();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const open = async (organizationId: typeof firm._id) => {
    if (organizationId === firm._id) {
      return;
    }
    const result = await run(() => setActive({ organizationId }));
    if (result.ok) {
      // A page of one firm's Deviz makes no sense in another firm.
      router.push("/estimates");
      onNavigate?.();
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-selected px-2 py-2 text-left shadow-raised transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span
            aria-hidden
            className="relative grid size-8 place-items-center rounded-sm bg-muted text-[12px] font-semibold tracking-[0.02em] text-ink-2"
          >
            {initials(firm.name)}
            {invitations.length > 0 && (
              // An invitation waits in the menu.
              <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-brand ring-2 ring-selected" />
            )}
          </span>
          <span className="grid min-w-0">
            <span className="truncate text-body font-medium text-ink">
              {firm.name}
            </span>
            <span className="truncate text-meta text-ink-2">
              {t(`kinds.${firm.kind}`)} · {t(`roles.${firm.role}`)}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-ink-3" aria-hidden />
          <span className="sr-only">
            {t("switch")}
            {invitations.length > 0 &&
              ` · ${tInvite("menuLabel")}: ${invitations.length}`}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-60">
          <DropdownMenuLabel className="text-label uppercase text-ink-3">
            {t("yourFirms")}
          </DropdownMenuLabel>
          {firms.map((item) => (
            <DropdownMenuItem key={item._id} onSelect={() => open(item._id)}>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item._id === firm._id && (
                <Check className="size-4" aria-label={t("current")} />
              )}
            </DropdownMenuItem>
          ))}
          {invitations.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-label uppercase text-ink-3">
                {tInvite("menuLabel")}
              </DropdownMenuLabel>
              {invitations.map((invitation) => (
                <DropdownMenuItem key={invitation._id} asChild>
                  <Link
                    href={`/invite/${invitation.token}`}
                    onClick={onNavigate}
                  >
                    <Icons.Assign className="size-4" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {invitation.organizationName}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {t("newFirm")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent closeLabel={t("close")} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("newFirm")}</DialogTitle>
            <DialogDescription>{t("newFirmDescription")}</DialogDescription>
          </DialogHeader>
          <FirmForm
            onCreated={() => {
              setCreating(false);
              router.push("/estimates");
              onNavigate?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
