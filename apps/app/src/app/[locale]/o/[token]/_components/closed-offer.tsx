"use client";

import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { useScopedI18n } from "@/locales/client";
import { ContactLinks, FirmMark } from "./offer-header";
import type { ClosedOfferView } from "./types";

/** The page's frame for a single message: loading, a bad link, a closed one. */
export function OfferFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-[520px]">{children}</div>
    </div>
  );
}

/** A link nobody was given: mistyped, cut short, or made up. */
export function MissingOffer() {
  const t = useScopedI18n("offerPage");
  return (
    <OfferFrame>
      <EmptyState
        icon={<Icons.Problem />}
        title={t("missingTitle")}
        description={t("missingDescription")}
      />
    </OfferFrame>
  );
}

/**
 * A link the firm withdrew, that expired, or that a newer revision replaced:
 * it shows only whom to ask, or where the new one is.
 */
export function ClosedOffer({ offer }: { offer: ClosedOfferView }) {
  const t = useScopedI18n("offerPage.closed");
  const firm = offer.firm.name;
  return (
    <OfferFrame>
      <EmptyState
        icon={<FirmMark firm={offer.firm} />}
        title={t(`${offer.reason}Title`)}
        description={t(`${offer.reason}Description`, { firm })}
        action={
          offer.replacementToken ? (
            <Button asChild>
              <Link href={`/o/${offer.replacementToken}`}>
                {t("openReplacement")}
              </Link>
            </Button>
          ) : (
            <ContactLinks firm={offer.firm} />
          )
        }
      />
    </OfferFrame>
  );
}
