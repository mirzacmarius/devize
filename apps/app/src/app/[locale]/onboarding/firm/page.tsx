"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FirmForm } from "@/components/firm-form";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";

type Invitations = FunctionReturnType<typeof api.accounts.invitations.listMine>;

/**
 * The second step after sign-up: every Deviz, client and rate belongs to a
 * Firmă. Someone a Firmă invited joins it here instead of creating one.
 */
export default function OnboardingFirm() {
  const t = useScopedI18n("firm");
  const tInvite = useScopedI18n("invite");
  const router = useRouter();
  const invitations = useQuery(api.accounts.invitations.listMine);
  if (invitations === undefined) {
    return null;
  }
  const invited = invitations.length > 0;
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center gap-8 px-4 py-24">
      {invited && <PendingInvitations invitations={invitations} />}
      <div className="grid gap-2">
        {invited ? (
          <h2 className="m-0 text-title-card text-ink">
            {tInvite("orCreate")}
          </h2>
        ) : (
          <h1 className="m-0 text-title-page text-ink">
            {t("onboardingTitle")}
          </h1>
        )}
        <p className="m-0 text-body-lg text-ink-2">
          {t("onboardingDescription")}
        </p>
      </div>
      <FirmForm onCreated={() => router.push("/estimates")} />
    </div>
  );
}

function PendingInvitations({ invitations }: { invitations: Invitations }) {
  const t = useScopedI18n("invite");
  const router = useRouter();
  const run = useRun();
  const accept = useMutation(api.accounts.invitations.accept);
  const [accepting, setAccepting] = useState<Id<"invitations"> | null>(null);

  const join = async (invitation: Invitations[number]) => {
    setAccepting(invitation._id);
    const result = await run(
      () => accept({ invitationId: invitation._id }),
      t("accepted", { firm: invitation.organizationName }),
    );
    if (result.ok) {
      router.push("/estimates");
    } else {
      setAccepting(null);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="m-0 text-title-page text-ink">{t("pendingTitle")}</h1>
        <p className="m-0 text-body-lg text-ink-2">{t("pendingDescription")}</p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0">
        {invitations.map((invitation) => (
          <li
            key={invitation._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-raised"
          >
            <div className="grid min-w-0">
              <span className="truncate text-body font-medium text-ink">
                {t("pendingItem", {
                  firm: invitation.organizationName,
                  role: t(`roles.${invitation.role}`),
                })}
              </span>
              {invitation.invitedByName && (
                <span className="truncate text-meta text-ink-3">
                  {t("pendingFrom", { name: invitation.invitedByName })}
                </span>
              )}
            </div>
            <Button
              size="sm"
              disabled={accepting !== null}
              onClick={() => join(invitation)}
            >
              {accepting === invitation._id && (
                <Icons.Loader className="animate-spin" aria-hidden />
              )}
              {t("accept")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
