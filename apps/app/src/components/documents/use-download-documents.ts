"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { DocumentKind, ExportOptions } from "@devize/forms";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { estimateCode, todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { type Estimate, exportData, fileName } from "./export-data";

async function fontFile(path: string) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Font ${path}: ${response.status}`);
  }
  return response.arrayBuffer();
}

function save(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(
    new Blob([bytes.slice()], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // The browser has the file once the click is handled.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Makes a Deviz's documents into one PDF in the browser and downloads it.
 * The PDF library and the fonts load on the first export, not with the page.
 */
export function useDownloadDocuments(estimate: Estimate) {
  const convex = useConvex();
  const t = useScopedI18n("documents");
  const errorMessage = useErrorMessage();
  return useCallback(
    async (
      kinds: readonly DocumentKind[],
      options: Omit<ExportOptions, "date">,
      // What the file is: "Formulare oficiale", or the Deviz's title.
      title: string,
    ): Promise<boolean> => {
      try {
        const [firm, client, forms, pdf, regular, bold] = await Promise.all([
          convex.query(api.accounts.organizations.get, {
            organizationId: estimate.organizationId,
          }),
          estimate.client
            ? convex.query(api.accounts.clients.get, {
                clientId: estimate.client._id,
              })
            : null,
          import("@devize/forms"),
          import("@devize/forms/pdf"),
          fontFile("/fonts/Geist-Regular.ttf"),
          fontFile("/fonts/Geist-SemiBold.ttf"),
        ]);
        const data = exportData(estimate, firm, client);
        const documents = forms.buildDocuments(data, kinds, {
          ...options,
          date: todayInput(),
        });
        const code = estimateCode(estimate.number, estimate.revision);
        const bytes = await pdf.renderPdf(documents, {
          fonts: { regular, bold },
          title: `${code} · ${title}`,
          author: firm.name,
        });
        save(bytes, fileName(code, title));
        return true;
      } catch (error) {
        if (appErrorOf(error)) {
          toast.error(errorMessage(error));
        } else {
          Sentry.captureException(error);
          toast.error(t("failed"));
        }
        return false;
      }
    },
    [convex, estimate, errorMessage, t],
  );
}
