"use client";

import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { Download } from "lucide-react";
import { useState } from "react";
import { formatDay } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { OpenOfferView } from "./types";
import { useWithdrawalPdf } from "./use-offer-pdf";

/**
 * A consumer's rights on a contract made at a distance (OUG 34/2014): the
 * 14 days to withdraw, how, what asking for an early start means, and the
 * withdrawal form to download. Shown when the firm marked the client a
 * consumer; the same words go in the PDF and in the confirmation email.
 */
export function RightsCard({
  token,
  offer,
}: {
  token: string;
  offer: OpenOfferView;
}) {
  const t = useScopedI18n("offerPage.rights");
  const locale = useCurrentLocale();
  const downloadForm = useWithdrawalPdf(token);
  const [busy, setBusy] = useState(false);
  const until = offer.accepted?.withdrawalUntil;
  const paragraphs = [
    t("distance", { firm: offer.firm.name }),
    t("how", {
      contact: offer.firm.email
        ? t("contact", { email: offer.firm.email })
        : "",
    }),
    t("earlyStart"),
  ];

  const download = async () => {
    setBusy(true);
    await downloadForm();
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="gap-3 pt-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="m-0 text-body text-ink-2">
            {paragraph}
          </p>
        ))}
        {until !== undefined && (
          <p className="m-0 text-body font-medium text-ink">
            {t("until", { date: formatDay(until, locale) })}
          </p>
        )}
        <p className="m-0 text-meta text-ink-3">{t("exceptions")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={busy}
          onClick={download}
        >
          {busy ? (
            <Icons.Loader className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          {t("form")}
        </Button>
      </CardContent>
    </Card>
  );
}
