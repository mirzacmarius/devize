"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { toast } from "@devize/ui/sonner";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ExternalLink, Mail, MessageCircle } from "lucide-react";
import { type ReactNode, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SignatureImage } from "@/components/signature/signature-image";
import { useRun } from "@/components/use-run";
import {
  formatDay,
  formatMoney,
  formatPercent,
  formatTime,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { OfferDialog } from "./offer-dialog";
import { copyText, offerUrl, useOrigin, whatsappNumber } from "./offer-link";

type Offer = NonNullable<
  FunctionReturnType<typeof api.offers.offers.forEstimate>
>;

const tones: Record<Offer["status"], StatusPillProps["tone"]> = {
  draft: "neutral",
  sent: "neutral",
  viewed: "neutral",
  accepted: "success",
  declined: "danger",
  expired: "warning",
  withdrawn: "neutral",
};

/**
 * The Deviz's Ofertă as the firm follows it: making the client's link and
 * sending it, the client's visits and what they look at, and their answer
 * with the signature.
 */
export function OfferCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("offer");
  const offer = useQuery(api.offers.offers.forEstimate, {
    estimateId: estimate._id,
  });
  const [creating, setCreating] = useState(false);
  if (offer === undefined) {
    return null;
  }

  const open = estimate.status === "draft" || estimate.status === "sent";
  const empty = estimate.lineItems.length === 0;
  const createButton = (label: string) =>
    open ? (
      <>
        <Button
          type="button"
          variant="outline"
          disabled={empty}
          onClick={() => setCreating(true)}
          className="justify-self-start"
        >
          {label}
        </Button>
        {empty && <p className="m-0 text-meta text-ink-3">{t("empty")}</p>}
      </>
    ) : (
      <p className="m-0 text-meta text-ink-3">{t("closed")}</p>
    );

  let body: ReactNode;
  if (offer === null) {
    body = (
      <>
        <p className="m-0 text-body text-ink-2">{t("hint")}</p>
        {createButton(t("create"))}
      </>
    );
  } else if (offer.status === "sent" || offer.status === "viewed") {
    body = <LiveOffer estimate={estimate} offer={offer} />;
  } else if (offer.status === "accepted") {
    body = <AcceptedOffer estimate={estimate} offer={offer} />;
  } else if (offer.status === "declined") {
    body = <DeclinedOffer offer={offer} />;
  } else {
    body = <EndedOffer offer={offer} action={createButton(t("newLink"))} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {offer && (
          <StatusPill tone={tones[offer.status]}>
            {t(`status.${offer.status}`)}
          </StatusPill>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">{body}</CardContent>
      <OfferDialog
        estimate={estimate}
        open={creating}
        onClose={() => setCreating(false)}
      />
    </Card>
  );
}

/** A link the client can still open: sharing it and following the visits. */
function LiveOffer({ estimate, offer }: { estimate: Estimate; offer: Offer }) {
  const t = useScopedI18n("offer");
  const locale = useCurrentLocale();
  const run = useRun();
  const withdraw = useMutation(api.offers.offers.withdraw);
  const firm = useQuery(api.accounts.organizations.get, {
    organizationId: estimate.organizationId,
  });
  const client = useQuery(
    api.accounts.clients.get,
    estimate.client ? { clientId: estimate.client._id } : "skip",
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const origin = useOrigin();
  const url = offerUrl(origin, offer.token);

  const message = [
    estimate.client
      ? t("shareGreeting", { name: estimate.client.name })
      : t("shareGreetingNoName"),
    t("shareText", {
      firm: firm?.name ?? "",
      title: estimate.title,
      link: url,
    }),
    t("shareHow"),
  ].join("\n");
  const phone = whatsappNumber(client?.phone);
  const whatsapp = `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(message)}`;
  const email = `mailto:${encodeURIComponent(client?.email ?? "")}?subject=${encodeURIComponent(
    t("emailSubject", { firm: firm?.name ?? "", title: estimate.title }),
  )}&body=${encodeURIComponent(message)}`;

  const copy = async () => {
    if (await copyText(url)) {
      toast.success(t("copied"));
    } else {
      toast.error(t("copyFailed"));
    }
  };

  const confirmWithdraw = async () => {
    setBusy(true);
    const result = await run(
      () => withdraw({ offerId: offer._id }),
      t("withdrawDone"),
    );
    setBusy(false);
    if (result.ok) {
      setConfirming(false);
    }
  };

  const facts = [
    t("sentOn", { date: formatDay(offer.sentAt, locale) }),
    offer.expiresAt !== undefined &&
      t("expiresOn", { date: formatDay(offer.expiresAt, locale) }),
    offer.depositPercent !== undefined &&
      t("deposit", { percent: formatPercent(offer.depositPercent, locale) }),
    offer.createdByName && t("madeBy", { name: offer.createdByName }),
  ].filter(Boolean);

  return (
    <>
      <div className="grid gap-1.5">
        <label htmlFor="offer-link" className="text-meta text-ink-3">
          {t("link")}
        </label>
        <div className="flex gap-2">
          <Input
            id="offer-link"
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
            className="min-w-0 font-mono text-code"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("copy")}
            onClick={copy}
          >
            <Icons.Copy aria-hidden />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={whatsapp} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden />
            {t("whatsapp")}
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={email}>
            <Mail aria-hidden />
            {t("email")}
          </a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={`/o/${offer.token}`} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />
            {t("openAsClient")}
          </a>
        </Button>
      </div>
      <div className="grid gap-1 text-meta text-ink-2">
        <span>{facts.join(" · ")}</span>
        <span>
          {offer.viewCount === 0 || offer.lastViewedAt === undefined
            ? t("notViewed")
            : t("views", {
                count: offer.viewCount,
                date: formatDay(offer.lastViewedAt, locale),
                time: formatTime(offer.lastViewedAt, locale),
              })}
        </span>
      </div>
      {(offer.variants.length > 0 || offer.optionalItems.length > 0) && (
        <ChoiceBox label={t("looking")} offer={offer} />
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start"
        onClick={() => setConfirming(true)}
      >
        {t("withdraw")}
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("withdrawTitle")}
        description={t("withdrawDescription")}
        confirm={t("withdrawConfirm")}
        destructive
        busy={busy}
        onConfirm={confirmWithdraw}
      />
    </>
  );
}

/** The Variantă and works the client looks at, or accepted, and their total. */
function ChoiceBox({ label, offer }: { label?: string; offer: Offer }) {
  const t = useScopedI18n("offer");
  const locale = useCurrentLocale();
  const { choice } = offer;
  const total = formatMoney(choice.totals.total, locale);
  return (
    <div className="grid gap-0.5 rounded-md border border-border bg-sunken px-3 py-2.5">
      {label && <span className="text-meta text-ink-3">{label}</span>}
      <span className="text-body text-ink">
        {choice.variantName
          ? t("variant", { name: choice.variantName })
          : offer.variants.length > 0 && offer.baseLabel
            ? t("variant", { name: offer.baseLabel })
            : t("defaultChoice")}
      </span>
      {choice.excluded.length > 0 && (
        <span className="text-meta text-ink-2">
          {t("without", {
            items: choice.excluded.map((item) => item.title).join(", "),
          })}
        </span>
      )}
      <span className="text-meta tabular-nums text-ink-2">
        {choice.totals.vat !== 0
          ? t("total", { total })
          : t("totalNoVat", { total })}
      </span>
    </div>
  );
}

/** The client's yes: who signed, when, for what, and their signature. */
function AcceptedOffer({
  estimate,
  offer,
}: {
  estimate: Estimate;
  offer: Offer;
}) {
  const t = useScopedI18n("offer");
  const locale = useCurrentLocale();
  const { signature } = offer;
  const signedAt = signature?.signedAt ?? offer.decidedAt;
  const name = signature?.name ?? estimate.client?.name ?? "";
  return (
    <>
      {signedAt !== undefined && (
        <p className="m-0 text-body text-ink">
          {t("accepted", {
            name,
            date: formatDay(signedAt, locale),
            time: formatTime(signedAt, locale),
          })}
        </p>
      )}
      <ChoiceBox offer={offer} />
      {signature &&
        (signature.path ? (
          <div className="rounded-md border border-border bg-card px-2">
            <SignatureImage
              path={signature.path}
              label={t("signatureLabel", { name: signature.name })}
            />
          </div>
        ) : (
          <p className="m-0 text-meta text-ink-3">{t("typedSignature")}</p>
        ))}
      <ClientViewLink token={offer.token} />
    </>
  );
}

/** The client's no, with their reason when they gave one. */
function DeclinedOffer({ offer }: { offer: Offer }) {
  const t = useScopedI18n("offer");
  const locale = useCurrentLocale();
  return (
    <>
      {offer.decidedAt !== undefined && (
        <p className="m-0 text-body text-ink">
          {t("declined", { date: formatDay(offer.decidedAt, locale) })}
        </p>
      )}
      <p className="m-0 whitespace-pre-line text-body text-ink-2">
        {offer.declineReason
          ? t("declineReason", { reason: offer.declineReason })
          : t("noReason")}
      </p>
      <p className="m-0 text-meta text-ink-3">{t("closed")}</p>
    </>
  );
}

/** A link that stopped working, withdrawn or expired, and the way to a new one. */
function EndedOffer({ offer, action }: { offer: Offer; action: ReactNode }) {
  const t = useScopedI18n("offer");
  const locale = useCurrentLocale();
  return (
    <>
      <p className="m-0 text-body text-ink-2">
        {offer.status === "expired" && offer.expiresAt !== undefined
          ? t("expired", { date: formatDay(offer.expiresAt, locale) })
          : t("withdrawn")}
      </p>
      {action}
    </>
  );
}

function ClientViewLink({ token }: { token: string }) {
  const t = useScopedI18n("offer");
  return (
    <Button variant="ghost" size="sm" className="justify-self-start" asChild>
      <a href={`/o/${token}`} target="_blank" rel="noreferrer">
        <ExternalLink aria-hidden />
        {t("openAsClient")}
      </a>
    </Button>
  );
}
