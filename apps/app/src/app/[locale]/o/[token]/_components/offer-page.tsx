"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Card, CardContent } from "@devize/ui/card";
import { StatusPill } from "@devize/ui/status-pill";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { estimateCode, formatCalendarDate, formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { AcceptDialog } from "./accept-dialog";
import { AnswerCard, MobileAnswerBar } from "./answer-card";
import { ClosedOffer, MissingOffer, OfferFrame } from "./closed-offer";
import { DeclineDialog } from "./decline-dialog";
import { OfferHeader } from "./offer-header";
import { PriceCard } from "./price-card";
import { QuestionsCard } from "./questions-card";
import type { Choice, OpenOfferView } from "./types";
import { useOfferPdf } from "./use-offer-pdf";
import { VariantPicker } from "./variant-picker";
import { WorksCard } from "./works-card";

// How long the client's choice rests before it is saved for the firm to see.
const SAVE_DELAY_MS = 800;

/**
 * A query's latest result, kept on screen while the same query loads with
 * new arguments, so the page doesn't blink each time the client chooses.
 */
function useLastResult<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) {
    setLast(value);
  }
  return value === undefined ? last : value;
}

/** Counts the client's visit once per page load; the server skips repeats. */
function useRecordVisit(token: string) {
  const recordView = useMutation(api.offers.public.recordView);
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) {
      return;
    }
    recorded.current = true;
    // The visit only informs the firm, so a failure needn't bother the client.
    recordView({ token }).catch(() => undefined);
  }, [recordView, token]);
}

/**
 * Saves what the client looks at, so the firm sees what they lean towards.
 * Accepting sends the choice again, so a save lost on the way is harmless.
 */
function useSaveChoice(token: string, choice: Choice | null, enabled: boolean) {
  const choose = useMutation(api.offers.public.choose);
  useEffect(() => {
    if (!choice || !enabled) {
      return;
    }
    const timer = setTimeout(() => {
      choose({ token, ...choice }).catch(() => undefined);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [choose, token, choice, enabled]);
}

/**
 * What a client sees on an Ofertă's link: the firm, the works and their price
 * in plain words, the Variante and optional works to choose from, and their
 * answer, signed. The page never prices anything: every total is the
 * server's, for the choice on screen.
 */
export function OfferPage({ token }: { token: string }) {
  const t = useScopedI18n("offerPage");
  // Null until the client changes something: until then, the server's stands.
  const [choice, setChoice] = useState<Choice | null>(null);
  const live = useQuery(api.offers.public.view, { token, ...choice });
  const offer = useLastResult(live);
  useRecordVisit(token);
  useSaveChoice(
    token,
    choice,
    offer?.state === "open" && offer.preview === false,
  );

  if (offer === undefined) {
    return (
      <OfferFrame>
        <p role="status" className="m-0 text-center text-body text-ink-3">
          {t("loading")}
        </p>
      </OfferFrame>
    );
  }
  if (offer === null) {
    return <MissingOffer />;
  }
  if (offer.state === "closed") {
    return <ClosedOffer offer={offer} />;
  }
  return (
    <OpenOffer
      token={token}
      offer={offer}
      choice={
        choice ?? {
          variantId: offer.choice.variantId,
          excludedItemIds: offer.choice.excludedItemIds,
        }
      }
      updating={live === undefined}
      onChoose={setChoice}
    />
  );
}

/** An Ofertă the client can answer, or answered, laid out for reading. */
export function OpenOffer({
  token,
  offer,
  choice,
  updating,
  onChoose,
}: {
  token: string;
  offer: OpenOfferView;
  choice: Choice;
  // The prices for `choice` are still on their way.
  updating: boolean;
  onChoose: (choice: Choice) => void;
}) {
  const t = useScopedI18n("offerPage");
  const [dialog, setDialog] = useState<"accept" | "decline" | null>(null);
  const [downloading, setDownloading] = useState(false);
  const downloadPdf = useOfferPdf(token);
  const open = offer.state === "open";

  const toggle = (itemId: Id<"lineItems">, included: boolean) => {
    const others = choice.excludedItemIds.filter((id) => id !== itemId);
    onChoose({
      ...choice,
      excludedItemIds: included ? others : [...others, itemId],
    });
  };
  const download = async () => {
    setDownloading(true);
    await downloadPdf(choice);
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <OfferHeader firm={offer.firm} preview={offer.preview} />
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-32 pt-8 sm:px-6 lg:pb-16">
        <OfferHero offer={offer} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
          <div className="grid min-w-0 gap-6">
            {offer.message && (
              <MessageCard firm={offer.firm.name} message={offer.message} />
            )}
            {offer.variants.length > 0 && (
              <VariantPicker
                offer={offer}
                value={choice.variantId}
                disabled={!open}
                onChange={(variantId) => onChoose({ ...choice, variantId })}
              />
            )}
            <WorksCard
              offer={offer}
              excluded={new Set(choice.excludedItemIds)}
              disabled={!open}
              onToggle={toggle}
            />
            <PriceCard offer={offer} updating={updating} />
            <QuestionsCard token={token} offer={offer} choice={choice} />
          </div>
          <aside className="grid min-w-0 gap-6 lg:sticky lg:top-6">
            <AnswerCard
              offer={offer}
              choice={choice}
              updating={updating}
              downloading={downloading}
              onAccept={() => setDialog("accept")}
              onDecline={() => setDialog("decline")}
              onDownload={download}
            />
          </aside>
        </div>
        <p className="m-0 text-center text-meta text-ink-3">{t("footer")}</p>
      </main>
      {open && (
        <>
          <MobileAnswerBar
            offer={offer}
            updating={updating}
            onAccept={() => setDialog("accept")}
          />
          <AcceptDialog
            token={token}
            offer={offer}
            choice={choice}
            open={dialog === "accept"}
            onClose={() => setDialog(null)}
          />
          <DeclineDialog
            token={token}
            open={dialog === "decline"}
            onClose={() => setDialog(null)}
          />
        </>
      )}
    </div>
  );
}

/** The Ofertă's title, for whom and where, and how long its prices hold. */
function OfferHero({ offer }: { offer: OpenOfferView }) {
  const t = useScopedI18n("offerPage");
  const locale = useCurrentLocale();
  const site = [offer.siteAddress, offer.county].filter(Boolean).join(", ");
  const meta = [
    offer.client && t("forClient", { name: offer.client.name }),
    site,
    t("pricesOf", { date: formatCalendarDate(offer.priceDate, locale) }),
    offer.state === "open" &&
      offer.expiresAt !== undefined &&
      t("validUntil", { date: formatDay(offer.expiresAt, locale) }),
  ].filter(Boolean);
  return (
    <div className="grid gap-2">
      <span className="text-label uppercase text-ink-3">
        {t("eyebrow", { code: estimateCode(offer.number, offer.revision) })}
      </span>
      <h1 className="m-0 text-title-page text-ink">{offer.title}</h1>
      <p className="m-0 text-body text-ink-2">{meta.join(" · ")}</p>
      {/* On a phone the answer is at the bottom, so its outcome shows here too. */}
      {offer.state !== "open" && (
        <StatusPill
          tone={offer.state === "accepted" ? "success" : "danger"}
          className="justify-self-start lg:hidden"
        >
          {offer.state === "accepted"
            ? t("accepted.title")
            : t("declined.title")}
        </StatusPill>
      )}
      {offer.description && (
        <p className="m-0 max-w-3xl whitespace-pre-line text-body-lg text-ink-2">
          {offer.description}
        </p>
      )}
    </div>
  );
}

/** The firm's note to the client, as it wrote it. */
function MessageCard({ firm, message }: { firm: string; message: string }) {
  const t = useScopedI18n("offerPage");
  return (
    <Card>
      <CardContent className="gap-2 pt-5">
        <span className="text-meta font-medium text-ink-3">
          {t("messageFrom", { firm })}
        </span>
        <p className="m-0 whitespace-pre-line text-body-lg text-ink">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
