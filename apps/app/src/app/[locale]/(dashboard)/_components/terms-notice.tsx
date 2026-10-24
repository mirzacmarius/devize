"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { TERMS_VERSION } from "@devize/backend/convex/accounts/terms";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { LegalLink } from "@/components/legal-link";
import { useRun } from "@/components/use-run";
import { formatCalendarDate } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

/**
 * Above every page while the Firmă hasn't accepted the current terms: one it
 * made before them, or one made by claiming a producer's profile, and every
 * firm after a new version (ADR 0051). An owner or admin accepts them here for
 * the whole firm; the others are asked to tell one. Nothing else waits for it.
 */
export function TermsNotice() {
  const { firm } = useFirm();
  const t = useScopedI18n("termsNotice");
  const legal = useScopedI18n("legal");
  const locale = useCurrentLocale();
  const acceptTerms = useMutation(api.accounts.organizations.acceptTerms);
  const run = useRun();
  const [accepting, setAccepting] = useState(false);
  if (firm.termsVersion === TERMS_VERSION) {
    return null;
  }
  const canAccept = firm.role === "owner" || firm.role === "admin";
  const links = {
    terms: <LegalLink document="terms" />,
    dpa: <LegalLink document="dpa" />,
  };

  const accept = async () => {
    setAccepting(true);
    await run(
      () => acceptTerms({ organizationId: firm._id, version: TERMS_VERSION }),
      t("accepted", { firm: firm.name }),
    );
    setAccepting(false);
  };

  return (
    <section
      aria-labelledby="terms-notice-title"
      className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6"
    >
      <div className="grid gap-1">
        <h2
          id="terms-notice-title"
          className="m-0 text-body font-medium text-ink"
        >
          {firm.termsVersion === null
            ? t("newTitle", { firm: firm.name })
            : t("updatedTitle")}
        </h2>
        <p className="m-0 text-body text-ink-2">
          {firm.termsVersion === null
            ? t("newBody", links)
            : t("updatedBody", {
                ...links,
                date: formatCalendarDate(TERMS_VERSION, locale, "long"),
                firm: firm.name,
              })}
        </p>
        <p className="m-0 text-meta text-ink-3">
          {canAccept ? legal("express") : t("ask")}
        </p>
      </div>
      {canAccept && (
        <Button
          type="button"
          size="sm"
          disabled={accepting}
          onClick={accept}
          className="shrink-0 self-start md:self-center"
        >
          {accepting && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("accept")}
        </Button>
      )}
    </section>
  );
}
