"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useRun } from "@/components/use-run";
import { signInPath } from "@/lib/return-path";
import { useScopedI18n } from "@/locales/client";

type Invitation = NonNullable<
  FunctionReturnType<typeof api.accounts.invitations.getByToken>
>;
type Busy = "accept" | "decline" | "open" | "switch";

/**
 * What an Invitație's link opens. The person invited joins the Firmă or
 * turns it down; someone signed in with another address is told whom it's
 * for, and signs in again with that address to come back here.
 */
export function InvitationPage({ token }: { token: string }) {
  const t = useScopedI18n("invite");
  const router = useRouter();
  const run = useRun();
  const { signOut } = useAuthActions();
  const live = useQuery(api.accounts.invitations.getByToken, { token });
  const accept = useMutation(api.accounts.invitations.accept);
  const decline = useMutation(api.accounts.invitations.decline);
  const setActive = useMutation(api.accounts.organizations.setActive);
  const [busy, setBusy] = useState<Busy | null>(null);
  // Accepting or declining deletes the invitation, so it stays on screen
  // while the next page opens.
  const [kept, setKept] = useState<Invitation | null>(null);
  const invitation = kept ?? live;

  if (invitation === undefined) {
    return (
      <Frame>
        <p role="status" className="m-0 text-center text-body text-ink-3">
          {t("loading")}
        </p>
      </Frame>
    );
  }

  if (invitation === null) {
    return (
      <Frame>
        <EmptyState
          icon={<Icons.Problem />}
          title={t("goneTitle")}
          description={t("goneDescription")}
          action={
            <Button variant="outline" asChild>
              <Link href="/">{t("goHome")}</Link>
            </Button>
          }
        />
      </Frame>
    );
  }

  const firm = invitation.organizationName;

  /** Runs `action`, then opens `next`; the button stays busy until it does. */
  const act = async (
    kind: Busy,
    action: () => Promise<unknown>,
    next: string,
    success?: string,
  ) => {
    setKept(invitation);
    setBusy(kind);
    const result = await run(action, success);
    if (result.ok) {
      router.push(next);
    } else {
      setKept(null);
      setBusy(null);
    }
  };

  const spinner = (kind: Busy) =>
    busy === kind && <Icons.Loader className="animate-spin" aria-hidden />;

  if (invitation.isMember) {
    return (
      <Frame>
        <EmptyState
          icon={<Icons.Check />}
          title={t("memberTitle", { firm })}
          action={
            <Button
              disabled={busy !== null}
              onClick={() =>
                act(
                  "open",
                  // Accepting uses up an invitation meant for this account.
                  () =>
                    invitation.forYou
                      ? accept({ invitationId: invitation._id })
                      : setActive({
                          organizationId: invitation.organizationId,
                        }),
                  "/estimates",
                )
              }
            >
              {spinner("open")}
              {t("openFirm")}
            </Button>
          }
        />
      </Frame>
    );
  }

  if (!invitation.forYou) {
    const switchAccount = async () => {
      setBusy("switch");
      await signOut();
      // A full load, so the server sees the session is gone.
      window.location.assign(signInPath(`/invite/${token}`));
    };
    return (
      <Frame>
        <EmptyState
          icon={<Icons.Problem />}
          title={t("otherEmailTitle")}
          description={
            invitation.signedInAs
              ? t("otherEmailDescription", {
                  email: invitation.email,
                  signedInAs: invitation.signedInAs,
                })
              : t("otherEmailNoAddress", { email: invitation.email })
          }
          action={
            <Button disabled={busy !== null} onClick={switchAccount}>
              {spinner("switch")}
              {t("switchAccount")}
            </Button>
          }
        />
      </Frame>
    );
  }

  return (
    <Frame>
      <EmptyState
        icon={
          invitation.logoUrl ? (
            <img
              src={invitation.logoUrl}
              alt=""
              className="size-full rounded-lg bg-card object-contain p-1"
            />
          ) : (
            <Icons.Assign />
          )
        }
        title={
          invitation.invitedByName
            ? t("heading", { name: invitation.invitedByName, firm })
            : t("headingNoName", { firm })
        }
        description={t("description", {
          role: t(`roles.${invitation.role}`),
        })}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={() =>
                act(
                  "decline",
                  () => decline({ invitationId: invitation._id }),
                  "/",
                  t("declined", { firm }),
                )
              }
            >
              {spinner("decline")}
              {t("decline")}
            </Button>
            <Button
              disabled={busy !== null}
              onClick={() =>
                act(
                  "accept",
                  () => accept({ invitationId: invitation._id }),
                  "/estimates",
                  t("accepted", { firm }),
                )
              }
            >
              {spinner("accept")}
              {t("accept")}
            </Button>
          </div>
        }
      />
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col justify-center px-4 py-24">
      {children}
    </div>
  );
}
