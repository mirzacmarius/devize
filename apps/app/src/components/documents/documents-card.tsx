"use client";

import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { type ReactNode, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import type { Estimate } from "./export-data";
import { FormsSheet } from "./forms-sheet";
import { TenderListSheet } from "./tender-list-sheet";
import {
  type DocumentsFormat,
  useDownloadDocuments,
} from "./use-download-documents";

/**
 * A Deviz as documents: the PDF or the Excel for its client, a tender's
 * official forms and the authority's own list filled in.
 */
export function DocumentsCard({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("documents");
  const download = useDownloadDocuments(estimate);
  // The client's Deviz being made, as a PDF or in Excel.
  const [downloading, setDownloading] = useState<DocumentsFormat>();
  const [formsOpen, setFormsOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const empty = estimate.lineItems.length === 0;
  // Positions imported from a tender's lists, which the authority wants
  // back priced in its own file.
  const tender = estimate.lineItems.some((item) => item.tenderRef);

  const downloadDeviz = async (format: DocumentsFormat) => {
    setDownloading(format);
    await download(["DEVIZ"], { withValues: true }, estimate.title, format);
    setDownloading(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        <ul className="m-0 grid list-none p-0">
          <DocumentRow
            icon={<Icons.Deviz aria-hidden />}
            title={t("deviz.title")}
            hint={t("deviz.hint")}
          >
            <div className="flex shrink-0 gap-2">
              {(["pdf", "xlsx"] as const).map((format) => (
                <Button
                  key={format}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={t(`deviz.download.${format}`)}
                  disabled={empty || downloading !== undefined}
                  onClick={() => downloadDeviz(format)}
                >
                  {downloading === format && (
                    <Icons.Loader className="animate-spin" aria-hidden />
                  )}
                  {t(`deviz.formats.${format}`)}
                </Button>
              ))}
            </div>
          </DocumentRow>
          <DocumentRow
            icon={<Icons.OfficialForms aria-hidden />}
            title={t("forms.title")}
            hint={t("forms.hint")}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={empty}
              onClick={() => setFormsOpen(true)}
            >
              {t("forms.open")}
            </Button>
          </DocumentRow>
          {tender && (
            <DocumentRow
              icon={<Icons.Spreadsheet aria-hidden />}
              title={t("list.title")}
              hint={t("list.hint")}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setListOpen(true)}
              >
                {t("list.open")}
              </Button>
            </DocumentRow>
          )}
        </ul>
        {empty && <p className="m-0 pt-1 text-meta text-ink-3">{t("empty")}</p>}
      </CardContent>
      <FormsSheet
        estimate={estimate}
        open={formsOpen}
        onClose={() => setFormsOpen(false)}
      />
      {tender && (
        <TenderListSheet
          estimate={estimate}
          open={listOpen}
          onClose={() => setListOpen(false)}
        />
      )}
    </Card>
  );
}

function DocumentRow({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <li className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex min-w-0 gap-2.5">
        <span className="mt-0.5 shrink-0 text-ink-3 [&_svg]:size-4">
          {icon}
        </span>
        <div className="grid min-w-0 gap-0.5">
          <span className="text-body font-medium text-ink">{title}</span>
          <span className="text-meta text-ink-3">{hint}</span>
        </div>
      </div>
      {children}
    </li>
  );
}
