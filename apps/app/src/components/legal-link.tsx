"use client";

import { type LegalDocument, legalPaths } from "@/lib/legal";
import { useScopedI18n } from "@/locales/client";

/**
 * A legal document's name, linking to it in a new tab, so the page it is on
 * keeps what was typed: "Accept {terms} și {dpa}".
 */
export function LegalLink({ document }: { document: LegalDocument }) {
  const t = useScopedI18n("legal");
  return (
    <a
      href={legalPaths[document]}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {t(document)}
    </a>
  );
}
