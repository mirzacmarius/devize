"use client";

import { Button } from "@devize/ui/button";
import { Mail, Phone } from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import type { OfferFirm } from "./types";

/** The firm's logo, or its initials on a tile when it has none. */
export function FirmMark({ firm }: { firm: OfferFirm }) {
  if (firm.logoUrl) {
    return (
      <img
        src={firm.logoUrl}
        alt=""
        className="size-10 shrink-0 rounded-lg border border-border bg-card object-contain p-1 sm:size-14"
      />
    );
  }
  const initials = firm.name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-body font-medium text-ink-2 shadow-[inset_0_0_0_1px_hsl(var(--border))] sm:size-14 sm:text-body-lg"
    >
      {initials}
    </span>
  );
}

/**
 * Buttons to call or write to the firm, from the details it filled in;
 * `compact` ones show only their icons on a phone.
 */
export function ContactLinks({
  firm,
  compact = false,
}: {
  firm: OfferFirm;
  compact?: boolean;
}) {
  const t = useScopedI18n("offerPage.contact");
  const phone = firm.phone?.replace(/[^\d+]/g, "");
  if (!phone && !firm.email) {
    return null;
  }
  return (
    <div className="flex shrink-0 flex-wrap justify-center gap-2">
      {phone && (
        <Button variant="outline" size="sm" asChild>
          <a href={`tel:${phone}`}>
            <Phone aria-hidden />
            <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
              {t("call")}
            </span>
          </a>
        </Button>
      )}
      {firm.email && (
        <Button variant="outline" size="sm" asChild>
          <a href={`mailto:${firm.email}`}>
            <Mail aria-hidden />
            <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
              {t("email")}
            </span>
          </a>
        </Button>
      )}
    </div>
  );
}

/**
 * The firm's letterhead across the top of the page, and, for the firm's own
 * people, a reminder that they see the client's page without acting for them.
 */
export function OfferHeader({
  firm,
  preview,
}: {
  firm: OfferFirm;
  preview: boolean;
}) {
  const t = useScopedI18n("offerPage");
  const details = [firm.cui && `CUI ${firm.cui}`, firm.county].filter(Boolean);
  return (
    <header className="max-sm:border-b max-sm:border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <FirmMark firm={firm} />
          <div className="grid min-w-0">
            <span className="truncate text-[17px] leading-6 tracking-[-0.005em] text-ink [font-weight:550]">
              {firm.name}
            </span>
            {details.length > 0 && (
              <span className="truncate text-meta text-ink-3">
                {details.join(" · ")}
              </span>
            )}
          </div>
        </div>
        <ContactLinks firm={firm} compact />
      </div>
      {preview && (
        <p
          role="note"
          className="m-0 border-t border-border bg-sunken px-4 py-2 text-center text-meta text-ink-2 sm:mx-2 sm:mb-2 sm:rounded-lg sm:border-t-0"
        >
          {t("preview")}
        </p>
      )}
    </header>
  );
}
