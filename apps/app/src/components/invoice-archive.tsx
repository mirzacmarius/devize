"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Download } from "lucide-react";
import { type ComponentProps, useCallback, useState } from "react";
import {
  fontFile,
  saveFile,
} from "@/components/documents/use-download-documents";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { formatCount, todayInput } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

type ArchivedInvoice = FunctionReturnType<
  typeof api.invoices.archive.page
>["page"][number];

type Progress =
  | { stage: "reading"; done: number }
  | { stage: "drawing"; done: number; total: number };

/** The firm's name as a file name keeps it: "Ana-Construct-SRL". */
function fileSafe(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "firma"
  );
}

/**
 * Downloads a firm's numbered invoices as one .zip: each invoice's PDF and
 * e-Factura XML in a folder for the year it was issued, and the register of
 * all of them as an Excel workbook. The browser draws the PDFs, as for one
 * invoice; the libraries load on the first download.
 */
export function useInvoiceArchive() {
  const convex = useConvex();
  const t = useScopedI18n("invoices.archive");
  const errorMessage = useErrorMessage();
  const [progress, setProgress] = useState<Progress | null>(null);

  const download = useCallback(
    async (
      organizationId: Id<"organizations">,
      firmName: string,
    ): Promise<boolean> => {
      setProgress({ stage: "reading", done: 0 });
      try {
        const invoices: ArchivedInvoice[] = [];
        let cursor: string | null = null;
        do {
          const result: FunctionReturnType<typeof api.invoices.archive.page> =
            await convex.query(api.invoices.archive.page, {
              organizationId,
              paginationOpts: { numItems: 10, cursor },
            });
          invoices.push(...result.page);
          setProgress({ stage: "reading", done: invoices.length });
          cursor = result.isDone ? null : result.continueCursor;
        } while (cursor !== null);
        if (invoices.length === 0) {
          toast.info(t("empty"));
          return false;
        }

        const [forms, pdfLib, xlsx, zip, regular, bold] = await Promise.all([
          import("@devize/forms/invoice"),
          import("@devize/forms/pdf"),
          import("@devize/forms/xlsx"),
          import("@devize/forms/zip"),
          fontFile("/fonts/Geist-Regular.ttf"),
          fontFile("/fonts/Geist-SemiBold.ttf"),
        ]);
        const today = todayInput();
        const files: Record<string, Uint8Array> = {};
        const encoder = new TextEncoder();
        for (const [index, invoice] of invoices.entries()) {
          setProgress({
            stage: "drawing",
            done: index,
            total: invoices.length,
          });
          const name = `Factura-${invoice.code ?? invoice._id}`;
          const folder = invoice.issueDate.slice(0, 4);
          files[`${folder}/${name}.pdf`] = await pdfLib.renderPdf(
            [forms.invoiceDocument(invoice)],
            {
              fonts: { regular, bold },
              title: name.replace("-", " "),
              author: invoice.seller.name,
            },
          );
          if (invoice.xml) {
            files[`${folder}/${name}.xml`] = encoder.encode(invoice.xml);
          }
        }
        files["Registrul facturilor.xlsx"] = xlsx.renderXlsx(
          [forms.invoiceRegister(invoices, firmName, today)],
          { title: "Registrul facturilor", author: firmName },
        );
        saveFile(
          zip.zipFiles(files),
          `Facturi-${fileSafe(firmName)}-${today}.zip`,
          "application/zip",
        );
        toast.success(t("done", { count: invoices.length }));
        return true;
      } catch (error) {
        if (appErrorOf(error)) {
          toast.error(errorMessage(error));
        } else {
          Sentry.captureException(error);
          toast.error(t("failed"));
        }
        return false;
      } finally {
        setProgress(null);
      }
    },
    [convex, errorMessage, t],
  );

  return { download, progress };
}

/** "Descarcă arhiva facturilor", which says how far it got while it works. */
export function InvoiceArchiveButton({
  organizationId,
  firmName,
  ...props
}: {
  organizationId: Id<"organizations">;
  firmName: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const t = useScopedI18n("invoices.archive");
  const locale = useCurrentLocale();
  const { download, progress } = useInvoiceArchive();
  const label =
    progress === null
      ? t("button")
      : progress.stage === "reading"
        ? t("reading", { count: formatCount(progress.done, locale) })
        : t("drawing", {
            done: formatCount(progress.done, locale),
            total: formatCount(progress.total, locale),
          });
  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      disabled={props.disabled || progress !== null}
      aria-live="polite"
      onClick={() => {
        void download(organizationId, firmName);
      }}
    >
      <Download aria-hidden />
      {label}
    </Button>
  );
}
