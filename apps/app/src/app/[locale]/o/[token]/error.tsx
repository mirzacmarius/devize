"use client";

import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { useScopedI18n } from "@/locales/client";
import { OfferFrame } from "./_components/closed-offer";

/** An Ofertă that couldn't load, most often for a dropped connection. */
export default function OfferError({ reset }: { reset: () => void }) {
  const t = useScopedI18n("offerPage");
  return (
    <OfferFrame>
      <EmptyState
        icon={<Icons.Problem />}
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={
          <Button variant="outline" onClick={reset}>
            {t("retry")}
          </Button>
        }
      />
    </OfferFrame>
  );
}
