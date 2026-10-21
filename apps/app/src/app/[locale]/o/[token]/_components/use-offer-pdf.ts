"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { fileName } from "@/components/documents/export-data";
import {
  fontFile,
  savePdf,
} from "@/components/documents/use-download-documents";
import { estimateCode, todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import type { Choice } from "./types";

/**
 * Downloads the Ofertă as the client's Deviz PDF, for the choice on screen:
 * the same document the firm downloads, made in the browser.
 */
export function useOfferPdf(token: string) {
  const convex = useConvex();
  const t = useScopedI18n("offerPage.decide");
  return useCallback(
    async (choice: Choice): Promise<boolean> => {
      try {
        const [data, forms, pdf, regular, bold] = await Promise.all([
          convex.query(api.offers.public.document, { token, ...choice }),
          import("@devize/forms"),
          import("@devize/forms/pdf"),
          fontFile("/fonts/Geist-Regular.ttf"),
          fontFile("/fonts/Geist-SemiBold.ttf"),
        ]);
        if (!data) {
          throw new Error("The offer's link no longer opens");
        }
        const documents = forms.buildDocuments(
          {
            ...data,
            // The client's Deviz prints works, not their resources.
            lineItems: data.lineItems.map((item) => ({
              ...item,
              resources: [],
            })),
          },
          ["DEVIZ"],
          { withValues: true, date: todayInput() },
        );
        const { estimate } = data;
        const code = estimateCode(estimate.number, estimate.revision);
        const bytes = await pdf.renderPdf(documents, {
          fonts: { regular, bold },
          title: `${code} · ${estimate.title}`,
          author: data.firm.name,
        });
        savePdf(bytes, fileName(code, estimate.title));
        return true;
      } catch (error) {
        Sentry.captureException(error);
        toast.error(t("downloadFailed"));
        return false;
      }
    },
    [convex, token, t],
  );
}
