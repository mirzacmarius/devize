"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { type ConvexReactClient, useConvex } from "convex/react";
import { useCallback } from "react";
import { fileName } from "@/components/documents/export-data";
import {
  fontFile,
  savePdf,
} from "@/components/documents/use-download-documents";
import { estimateCode, todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import type { Choice } from "./types";

/** The Ofertă's export data, the forms library, the PDF writer and its fonts. */
async function load(convex: ConvexReactClient, token: string, choice?: Choice) {
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
  return {
    data: {
      ...data,
      // The client's Deviz prints works, not their resources.
      lineItems: data.lineItems.map((item) => ({ ...item, resources: [] })),
    },
    forms,
    pdf,
    fonts: { regular, bold },
  };
}

/**
 * Downloads the Ofertă as the client's Deviz PDF, for the choice on screen:
 * the same document the firm downloads, made in the browser. A consumer's
 * copy ends with the withdrawal form of OUG 34/2014.
 */
export function useOfferPdf(token: string) {
  const convex = useConvex();
  const t = useScopedI18n("offerPage.decide");
  return useCallback(
    async (choice: Choice): Promise<boolean> => {
      try {
        const { data, forms, pdf, fonts } = await load(convex, token, choice);
        const documents = forms.buildDocuments(data, ["DEVIZ"], {
          withValues: true,
          date: todayInput(),
        });
        if (data.offer.consumer) {
          documents.push(forms.withdrawalDocument(data));
        }
        const { estimate } = data;
        const code = estimateCode(estimate.number, estimate.revision);
        const bytes = await pdf.renderPdf(documents, {
          fonts,
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

/** Downloads the withdrawal form alone, filled with the firm and the Ofertă. */
export function useWithdrawalPdf(token: string) {
  const convex = useConvex();
  const t = useScopedI18n("offerPage.rights");
  return useCallback(async (): Promise<boolean> => {
    try {
      const { data, forms, pdf, fonts } = await load(convex, token);
      const { estimate } = data;
      const code = estimateCode(estimate.number, estimate.revision);
      const form = forms.withdrawalDocument(data);
      const bytes = await pdf.renderPdf([form], {
        fonts,
        title: `${code} · ${form.name}`,
        author: data.firm.name,
      });
      savePdf(bytes, fileName(code, form.name));
      return true;
    } catch (error) {
      Sentry.captureException(error);
      toast.error(t("formFailed"));
      return false;
    }
  }, [convex, token, t]);
}
