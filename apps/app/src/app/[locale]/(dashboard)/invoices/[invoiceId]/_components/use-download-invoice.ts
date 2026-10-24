"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import {
  fontFile,
  saveFile,
  savePdf,
} from "@/components/documents/use-download-documents";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";

/**
 * Makes an invoice's PDF in the browser, or fetches its e-Factura XML, and
 * downloads it. The PDF library and fonts load on the first download.
 */
export function useDownloadInvoice() {
  const convex = useConvex();
  const t = useScopedI18n("invoices.page");
  const errorMessage = useErrorMessage();

  const fail = useCallback(
    (error: unknown) => {
      if (appErrorOf(error)) {
        toast.error(errorMessage(error));
      } else {
        Sentry.captureException(error);
        toast.error(t("downloadFailed"));
      }
    },
    [errorMessage, t],
  );

  const pdf = useCallback(
    async (invoice: Invoice, issuer?: string): Promise<boolean> => {
      try {
        const [forms, pdfLib, regular, bold] = await Promise.all([
          import("@devize/forms/invoice"),
          import("@devize/forms/pdf"),
          fontFile("/fonts/Geist-Regular.ttf"),
          fontFile("/fonts/Geist-SemiBold.ttf"),
        ]);
        const document = forms.invoiceDocument({ ...invoice, issuer });
        const name = invoice.code ?? "ciorna";
        const bytes = await pdfLib.renderPdf([document], {
          fonts: { regular, bold },
          title: `Factura ${name}`,
          author: invoice.seller.name,
        });
        savePdf(bytes, `Factura-${name}.pdf`);
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    [fail],
  );

  const xml = useCallback(
    async (invoiceId: Id<"invoices">): Promise<boolean> => {
      try {
        const file = await convex.query(api.invoices.xml.forInvoice, {
          invoiceId,
        });
        saveFile(
          new TextEncoder().encode(file.xml),
          file.fileName,
          "application/xml",
        );
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    [convex, fail],
  );

  return { pdf, xml };
}
