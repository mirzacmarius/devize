"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { DocumentKind, ExportOptions, FormDocument } from "@devize/forms";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { estimateCode, todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { type Estimate, exportData, fileName } from "./export-data";

/** A font for the PDF, from the app's public files. */
export async function fontFile(path: string) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Font ${path}: ${response.status}`);
  }
  return response.arrayBuffer();
}

/** Hands a file made in the browser to the person as a download. */
export function saveFile(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes.slice()], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // The browser has the file once the click is handled.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Hands a PDF made in the browser to the person as a download. */
export function savePdf(bytes: Uint8Array, name: string) {
  saveFile(bytes, name, "application/pdf");
}

/** What a Deviz's documents download as: one PDF, or one Excel workbook. */
export type DocumentsFormat = "pdf" | "xlsx";

const fileTypes: Record<DocumentsFormat, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Writes documents into a file, titled and signed by the firm. */
type Writer = (
  documents: FormDocument[],
  title: string,
  author: string,
) => Promise<Uint8Array>;

/** The PDF writer, with the library and the fonts it draws with. */
async function pdfWriter(): Promise<Writer> {
  const [pdf, regular, bold] = await Promise.all([
    import("@devize/forms/pdf"),
    fontFile("/fonts/Geist-Regular.ttf"),
    fontFile("/fonts/Geist-SemiBold.ttf"),
  ]);
  return (documents, title, author) =>
    pdf.renderPdf(documents, { fonts: { regular, bold }, title, author });
}

/** The Excel writer. */
async function xlsxWriter(): Promise<Writer> {
  const { renderXlsx } = await import("@devize/forms/xlsx");
  return async (documents, title, author) =>
    renderXlsx(documents, { title, author });
}

/**
 * Makes a Deviz's documents into one PDF, or one Excel workbook with a
 * sheet for each, in the browser and downloads it. The writer, and the
 * PDF's fonts, load on the first export, not with the page.
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
      format: DocumentsFormat = "pdf",
    ): Promise<boolean> => {
      try {
        const [firm, client, forms, write] = await Promise.all([
          convex.query(api.accounts.organizations.get, {
            organizationId: estimate.organizationId,
          }),
          estimate.client
            ? convex.query(api.accounts.clients.get, {
                clientId: estimate.client._id,
              })
            : null,
          import("@devize/forms"),
          format === "xlsx" ? xlsxWriter() : pdfWriter(),
        ]);
        // The rooms and takeoffs, only for the Anexă · Antemăsurătoare.
        const takeoff = kinds.includes("AM")
          ? await convex.query(api.takeoffs.page.forExport, {
              estimateId: estimate._id,
            })
          : null;
        const data = { ...exportData(estimate, firm, client), takeoff };
        const documents = forms.buildDocuments(data, kinds, {
          ...options,
          date: todayInput(),
        });
        const code = estimateCode(estimate.number, estimate.revision);
        const bytes = await write(documents, `${code} · ${title}`, firm.name);
        saveFile(bytes, fileName(code, title, format), fileTypes[format]);
        return true;
      } catch (error) {
        if (appErrorOf(error)) {
          toast.error(errorMessage(error));
        } else {
          Sentry.captureException(error);
          toast.error(t(format === "xlsx" ? "failedExcel" : "failed"));
        }
        return false;
      }
    },
    [convex, estimate, errorMessage, t],
  );
}
