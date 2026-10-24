"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { ReceptionData, StatementData } from "@devize/forms/progress";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { fileName } from "@/components/documents/export-data";
import {
  type DocumentsFormat,
  fileTypes,
  pdfWriter,
  saveFile,
  xlsxWriter,
} from "@/components/documents/use-download-documents";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { estimateCode, todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import type { Reception, Statement, Works } from "./types";

/**
 * Makes a Situație de lucrări, with or without its Atașament, into a PDF
 * or an Excel workbook, and a Proces-verbal de recepție into a PDF, in the
 * browser, and downloads it. The writers load on the first export.
 */
export function useDownloadProgress(works: Works) {
  const convex = useConvex();
  const t = useScopedI18n("documents");
  const errorMessage = useErrorMessage();

  const parties = useCallback(async () => {
    const [firm, client] = await Promise.all([
      convex.query(api.accounts.organizations.get, {
        organizationId: works.organizationId,
      }),
      works.clientId
        ? convex.query(api.accounts.clients.get, { clientId: works.clientId })
        : null,
    ]);
    return {
      firm: {
        name: firm.name,
        cui: firm.cui,
        tradeRegister: firm.tradeRegister,
        address: firm.address,
        county: firm.county,
        email: firm.email,
        phone: firm.phone,
      },
      client: client
        ? {
            name: client.name,
            cui: client.cui,
            address: client.address,
            email: client.email,
            phone: client.phone,
          }
        : works.client && { name: works.client.name },
    };
  }, [convex, works]);

  const estimate = useCallback(
    () => ({
      number: works.number,
      revision: works.revision,
      title: works.title,
      siteAddress: works.siteAddress,
      county: works.county,
    }),
    [works],
  );

  const fail = useCallback(
    (error: unknown, format: DocumentsFormat) => {
      if (appErrorOf(error)) {
        toast.error(errorMessage(error));
      } else {
        Sentry.captureException(error);
        toast.error(t(format === "xlsx" ? "failedExcel" : "failed"));
      }
      return false;
    },
    [errorMessage, t],
  );

  const downloadStatement = useCallback(
    async (
      statement: Statement,
      format: DocumentsFormat,
      withAttachment: boolean,
      title: string,
    ): Promise<boolean> => {
      try {
        const [{ firm, client }, forms, write] = await Promise.all([
          parties(),
          import("@devize/forms/progress"),
          format === "xlsx" ? xlsxWriter() : pdfWriter(),
        ]);
        const data: StatementData = {
          estimate: estimate(),
          statement: {
            number: statement.number,
            status: statement.status,
            periodStart: statement.periodStart,
            periodEnd: statement.periodEnd,
            date: statement.date,
            notes: statement.notes,
            markups: statement.markups,
            retention: statement.retention,
            approvedBy: statement.approvedBy,
            approvedAt: statement.approvedAt,
          },
          rows: statement.rows,
          firm,
          client,
          guarantee: statement.guarantee,
        };
        const documents = forms.statementDocuments(data, {
          attachment: withAttachment,
          date: todayInput(),
        });
        const code = estimateCode(works.number, works.revision);
        const bytes = await write(documents, `${code} · ${title}`, firm.name);
        saveFile(bytes, fileName(code, title, format), fileTypes[format]);
        return true;
      } catch (error) {
        return fail(error, format);
      }
    },
    [estimate, fail, parties, works.number, works.revision],
  );

  const downloadReception = useCallback(
    async (
      reception: Reception,
      // The approved works without VAT, and the PV at the end of the works
      // a final one follows.
      value: number,
      completion: { number?: string; date: string } | null,
      title: string,
    ): Promise<boolean> => {
      try {
        const [{ firm, client }, forms, write] = await Promise.all([
          parties(),
          import("@devize/forms/progress"),
          pdfWriter(),
        ]);
        const data: ReceptionData = {
          estimate: estimate(),
          reception,
          firm,
          client,
          value,
          vatRate: works.markups.vat,
          completion,
        };
        const code = estimateCode(works.number, works.revision);
        const bytes = await write(
          [forms.receptionDocument(data)],
          `${code} · ${title}`,
          firm.name,
        );
        saveFile(bytes, fileName(code, title, "pdf"), fileTypes.pdf);
        return true;
      } catch (error) {
        return fail(error, "pdf");
      }
    },
    [estimate, fail, parties, works.markups.vat, works.number, works.revision],
  );

  return { downloadStatement, downloadReception };
}
