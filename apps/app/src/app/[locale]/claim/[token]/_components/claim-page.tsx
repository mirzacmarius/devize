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
import {
  ClaimFirmSelect,
  chosenFirm,
  type FirmChoice,
  NEW_FIRM,
} from "@/components/claim-firm-select";
import { useRun } from "@/components/use-run";
import { signInPath } from "@/lib/return-path";
import { useScopedI18n } from "@/locales/client";

type ClaimLink = NonNullable<
  FunctionReturnType<typeof api.producers.claimLinks.get>
>;

/**
 * What a claim link opens: the Producător's profile, for the address Devize
 * sent the link to. That person claims it for one of their Producător firms or
 * a new one; anyone else is told whom it's for.
 */
export function ClaimPage({ token }: { token: string }) {
  const t = useScopedI18n("claim");
  const live = useQuery(api.producers.claimLinks.get, { token });
  // Claiming uses the link up, so it stays on screen while the profile opens.
  const [kept, setKept] = useState<ClaimLink | null>(null);
  const link = kept ?? live;
  // The time is read once, when the link first shows.
  const [now] = useState(() => Date.now());

  if (link === undefined) {
    return (
      <Frame>
        <p role="status" className="m-0 text-center text-body text-ink-3">
          {t("loading")}
        </p>
      </Frame>
    );
  }

  const name = link?.manufacturerName ?? "";
  if (link === null || (link.used && !link.claimed)) {
    return (
      <Gone
        title={t("goneTitle")}
        description={t("goneDescription")}
        home={t("goHome")}
      />
    );
  }
  if (link.claimed && !kept) {
    return (
      <Frame>
        <EmptyState
          icon={<Icons.Producers />}
          title={t("usedTitle", { name })}
          description={link.isProducer ? undefined : t("usedDescription")}
          action={
            <Button variant="outline" asChild>
              {link.isProducer ? (
                <Link href={`/producers/${link.manufacturerId}`}>
                  {t("openProfile")}
                </Link>
              ) : (
                <Link href="/">{t("goHome")}</Link>
              )}
            </Button>
          }
        />
      </Frame>
    );
  }
  if (link.expiresAt <= now && !kept) {
    return (
      <Gone
        title={t("expiredTitle")}
        description={t("expiredDescription")}
        home={t("goHome")}
      />
    );
  }
  if (!link.forYou && !kept) {
    return <OtherAddress link={link} token={token} />;
  }
  return <ClaimForm link={link} token={token} onClaiming={setKept} />;
}

function ClaimForm({
  link,
  token,
  onClaiming,
}: {
  link: ClaimLink;
  token: string;
  onClaiming: (link: ClaimLink | null) => void;
}) {
  const t = useScopedI18n("claim");
  const router = useRouter();
  const run = useRun();
  const claim = useMutation(api.producers.claimLinks.claim);
  const [firm, setFirm] = useState<FirmChoice>(link.firms[0]?._id ?? NEW_FIRM);
  const [busy, setBusy] = useState(false);
  const name = link.manufacturerName;

  const submit = async () => {
    onClaiming(link);
    setBusy(true);
    const result = await run(
      () => claim({ token, organizationId: chosenFirm(firm) }),
      t("claimed", { name }),
    );
    if (result.ok) {
      router.push(`/producers/${result.value.manufacturerId}`);
    } else {
      onClaiming(null);
      setBusy(false);
    }
  };

  return (
    <Frame>
      <EmptyState
        icon={<Icons.Producers />}
        title={t("heading", { name })}
        description={t("description", { name })}
        action={
          <div className="grid w-full max-w-sm gap-5 text-left">
            <ClaimFirmSelect
              id="claim-link-firm"
              firms={link.firms}
              value={firm}
              onChange={setFirm}
              label={t("firm")}
              newLabel={t("newFirm", { name })}
            />
            <Button disabled={busy} onClick={submit}>
              {busy && <Icons.Loader className="animate-spin" aria-hidden />}
              {t("action")}
            </Button>
          </div>
        }
      />
    </Frame>
  );
}

function OtherAddress({ link, token }: { link: ClaimLink; token: string }) {
  const t = useScopedI18n("claim");
  const { signOut } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const switchAccount = async () => {
    setBusy(true);
    await signOut();
    // A full load, so the server sees the session is gone.
    window.location.assign(signInPath(`/claim/${token}`));
  };
  return (
    <Frame>
      <EmptyState
        icon={<Icons.Problem />}
        title={t("otherEmailTitle")}
        description={
          link.signedInAs
            ? t("otherEmailDescription", {
                email: link.email,
                signedInAs: link.signedInAs,
              })
            : t("otherEmailNoAddress", { email: link.email })
        }
        action={
          <Button disabled={busy} onClick={switchAccount}>
            {busy && <Icons.Loader className="animate-spin" aria-hidden />}
            {t("switchAccount")}
          </Button>
        }
      />
    </Frame>
  );
}

function Gone({
  title,
  description,
  home,
}: {
  title: string;
  description: string;
  home: string;
}) {
  return (
    <Frame>
      <EmptyState
        icon={<Icons.Problem />}
        title={title}
        description={description}
        action={
          <Button variant="outline" asChild>
            <Link href="/">{home}</Link>
          </Button>
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
