"use client";

import { roundLei } from "@devize/backend/convex/estimates/recap";
import { Button } from "@devize/ui/button";
import { Card, CardContent } from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { StatusPill } from "@devize/ui/status-pill";
import { cn } from "@devize/ui/utils";
import { SignatureImage } from "@/components/signature/signature-image";
import {
  formatDay,
  formatMoney,
  formatPercent,
  formatTime,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Choice, OpenOfferView } from "./types";

/** The Variantă the client looks at, when the firm offers several. */
export function variantName(offer: OpenOfferView, choice: Choice) {
  if (offer.variants.length === 0) {
    return undefined;
  }
  return (
    offer.variants.find((variant) => variant._id === choice.variantId)?.name ??
    offer.baseLabel
  );
}

/** What the client accepts: the Variantă, the works left out, the total. */
export function ChoiceSummary({
  offer,
  choice,
  className,
}: {
  offer: OpenOfferView;
  choice: Choice;
  className?: string;
}) {
  const t = useScopedI18n("offerPage.accept");
  const locale = useCurrentLocale();
  const name = variantName(offer, choice);
  const leftOut = offer.items
    .filter((item) => choice.excludedItemIds.includes(item._id))
    .map((item) => item.title);
  const total = formatMoney(offer.choice.totals.total, locale);
  return (
    <div
      className={cn(
        "grid gap-1 rounded-md border border-border bg-sunken px-4 py-3 text-body text-ink-2",
        className,
      )}
    >
      {name && <span>{t("summaryVariant", { name })}</span>}
      {leftOut.length > 0 && (
        <span>{t("summaryWithout", { items: leftOut.join(", ") })}</span>
      )}
      <span className="font-medium tabular-nums text-ink">
        {offer.choice.totals.vat !== 0
          ? t("summaryTotal", { total })
          : t("summaryTotalNoVat", { total })}
      </span>
    </div>
  );
}

/** The total the client would accept, large, and the deposit it asks for. */
function TotalBlock({
  offer,
  updating,
}: {
  offer: OpenOfferView;
  updating: boolean;
}) {
  const t = useScopedI18n("offerPage");
  const locale = useCurrentLocale();
  const { total, vat } = offer.choice.totals;
  const deposit = offer.depositPercent;
  return (
    <div className="grid gap-1">
      <span className="text-meta text-ink-3">
        {vat !== 0 ? t("total") : t("totalNoVat")}
      </span>
      <span
        aria-live="polite"
        className={cn(
          "text-kpi tabular-nums text-ink transition-opacity",
          updating && "opacity-60",
        )}
      >
        {formatMoney(total, locale)}{" "}
        <span className="text-body-lg text-ink-3">lei</span>
      </span>
      {deposit !== undefined && (
        <span className="text-meta text-ink-2">
          {t("deposit", {
            percent: formatPercent(deposit, locale),
            amount: formatMoney(roundLei((total * deposit) / 100), locale),
          })}
        </span>
      )}
    </div>
  );
}

/**
 * The client's answer: accept, decline or download while the Ofertă is open,
 * then what they answered, with their signature.
 */
export function AnswerCard({
  offer,
  choice,
  updating,
  downloading,
  onAccept,
  onDecline,
  onDownload,
}: {
  offer: OpenOfferView;
  choice: Choice;
  updating: boolean;
  downloading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onDownload: () => void;
}) {
  const t = useScopedI18n("offerPage");
  const locale = useCurrentLocale();
  const download = (
    <Button
      type="button"
      variant="outline"
      disabled={downloading}
      onClick={onDownload}
    >
      {downloading && <Icons.Loader className="animate-spin" aria-hidden />}
      {t("decide.download")}
    </Button>
  );

  if (offer.state === "accepted") {
    const { accepted } = offer;
    return (
      <Card>
        <CardContent className="gap-4 pt-5">
          <div className="grid gap-2">
            <StatusPill tone="success" className="justify-self-start">
              {t("accepted.title")}
            </StatusPill>
            {accepted && (
              <p className="m-0 text-body text-ink-2">
                {t("accepted.description", {
                  date: formatDay(accepted.signedAt, locale),
                  time: formatTime(accepted.signedAt, locale),
                  firm: offer.firm.name,
                })}
              </p>
            )}
          </div>
          <ChoiceSummary offer={offer} choice={choice} />
          {accepted && (
            <figure className="m-0 grid gap-1">
              {accepted.path ? (
                <div className="rounded-md border border-border bg-card px-2">
                  <SignatureImage
                    path={accepted.path}
                    label={t("accepted.signatureLabel", {
                      name: accepted.name,
                    })}
                  />
                </div>
              ) : (
                <p className="m-0 text-meta text-ink-3">
                  {t("accepted.typedSignature")}
                </p>
              )}
              <figcaption className="text-meta text-ink-2">
                {t("accepted.signedBy", { name: accepted.name })}
              </figcaption>
            </figure>
          )}
          {accepted && (
            <div className="grid gap-1 text-meta text-ink-2">
              {offer.confirmation && (
                <span>
                  {t("accepted.confirmation", {
                    email: offer.confirmation.email,
                  })}
                </span>
              )}
              {accepted.withdrawalUntil !== undefined && (
                <span>
                  {t("accepted.withdrawalUntil", {
                    date: formatDay(accepted.withdrawalUntil, locale),
                  })}
                </span>
              )}
              {accepted.earlyStart && <span>{t("accepted.earlyStart")}</span>}
              {accepted.contentHash && (
                <span className="break-all font-mono text-code text-ink-3">
                  {t("accepted.code", { hash: accepted.contentHash })}
                </span>
              )}
            </div>
          )}
          {download}
        </CardContent>
      </Card>
    );
  }

  if (offer.state === "declined") {
    const { declined } = offer;
    return (
      <Card>
        <CardContent className="gap-4 pt-5">
          <div className="grid gap-2">
            <StatusPill tone="danger" className="justify-self-start">
              {t("declined.title")}
            </StatusPill>
            {declined?.at !== undefined && (
              <p className="m-0 text-body text-ink-2">
                {t("declined.description", {
                  date: formatDay(declined.at, locale),
                  time: formatTime(declined.at, locale),
                  firm: offer.firm.name,
                })}
              </p>
            )}
            {declined?.reason && (
              <p className="m-0 whitespace-pre-line text-body text-ink-2">
                {t("declined.reason", { reason: declined.reason })}
              </p>
            )}
          </div>
          {download}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="gap-5 pt-5">
        <TotalBlock offer={offer} updating={updating} />
        <div className="grid gap-2">
          <Button
            type="button"
            size="lg"
            disabled={offer.preview || updating}
            onClick={onAccept}
          >
            <Icons.Check aria-hidden />
            {t("decide.accept")}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={offer.preview}
              onClick={onDecline}
            >
              {t("decide.decline")}
            </Button>
            {download}
          </div>
        </div>
        {offer.expiresAt !== undefined && (
          <p className="m-0 text-meta text-ink-3">
            {t("validUntil", { date: formatDay(offer.expiresAt, locale) })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * On a phone, the total and the accept button stay at the bottom of the
 * screen while the client reads through the works.
 */
export function MobileAnswerBar({
  offer,
  updating,
  onAccept,
}: {
  offer: OpenOfferView;
  updating: boolean;
  onAccept: () => void;
}) {
  const t = useScopedI18n("offerPage");
  const locale = useCurrentLocale();
  const { total, vat } = offer.choice.totals;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="grid min-w-0">
          <span className="text-meta text-ink-3">
            {vat !== 0 ? t("total") : t("totalNoVat")}
          </span>
          <span
            className={cn(
              "truncate text-title-card tabular-nums text-ink transition-opacity",
              updating && "opacity-60",
            )}
          >
            {t("totals.lei", { total: formatMoney(total, locale) })}
          </span>
        </div>
        <Button
          type="button"
          disabled={offer.preview || updating}
          onClick={onAccept}
        >
          {t("decide.accept")}
        </Button>
      </div>
    </div>
  );
}
