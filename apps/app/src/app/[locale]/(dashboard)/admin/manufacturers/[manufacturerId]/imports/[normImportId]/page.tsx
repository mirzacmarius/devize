"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  ExternalLink,
  IssueList,
  importTone,
  Pill,
  type Tone,
  useRun,
} from "../../../../_components/ui";

type ImportData = NonNullable<
  FunctionReturnType<typeof api.manufacturers.normImports.get>
>;
type Norm = ImportData["norms"][number];

const normTone: Record<string, Tone> = {
  review: "warning",
  approved: "success",
  rejected: "neutral",
};

export default function NormImportPage() {
  const t = useScopedI18n("admin.import");
  const tAdmin = useScopedI18n("admin");
  const params = useParams<{ manufacturerId: string; normImportId: string }>();
  const normImportId = params.normImportId as Id<"normImports">;
  const data = useQuery(api.manufacturers.normImports.get, { normImportId });
  const [page, setPage] = useState<number | undefined>();

  if (data === undefined) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary/40" />;
  }
  if (data === null) {
    return <p className="text-sm text-primary/60">{t("notFound")}</p>;
  }

  const { normImport, norms, fileUrl } = data;
  const byArticle = new Map<string, Norm[]>();
  for (const norm of norms) {
    byArticle.set(norm.baseCode, [
      ...(byArticle.get(norm.baseCode) ?? []),
      norm,
    ]);
  }
  const count = (status: Norm["status"]) =>
    norms.filter((norm) => norm.status === status).length;

  return (
    <div className="flex w-full flex-col gap-6">
      <Link
        href={`/admin/manufacturers/${normImport.manufacturerId}`}
        className="flex w-fit items-center gap-1 text-sm text-primary/60 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium text-primary/80">
          {normImport.fileName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-primary/60">
          <Pill tone={importTone[normImport.status]}>
            {tAdmin(`status.import.${normImport.status}`)}
          </Pill>
          {normImport.edition && (
            <span>{t("edition", { edition: normImport.edition })}</span>
          )}
          {normImport.laborRate !== undefined && (
            <span>{t("laborRate", { rate: normImport.laborRate })}</span>
          )}
          <span>
            {t("summary", {
              approved: count("approved"),
              rejected: count("rejected"),
              total: norms.length,
            })}
          </span>
          {fileUrl && (
            <ExternalLink href={fileUrl}>{t("openPdf")}</ExternalLink>
          )}
        </div>
        <p className="text-sm text-primary/50">{t("catalogNote")}</p>
      </div>

      <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {normImport.articles.map((article) => (
            <Article
              key={article.baseCode}
              normImportId={normImport._id}
              article={article}
              norms={byArticle.get(article.baseCode) ?? []}
              onShowPage={setPage}
            />
          ))}
        </div>
        {fileUrl && (
          <div className="hidden xl:block">
            <iframe
              key={page}
              title={normImport.fileName}
              src={`${fileUrl}#page=${page ?? 1}`}
              className="sticky top-32 h-[calc(100vh-10rem)] w-full rounded-lg border border-border bg-card"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Article({
  normImportId,
  article,
  norms,
  onShowPage,
}: {
  normImportId: Id<"normImports">;
  article: ImportData["normImport"]["articles"][number];
  norms: Norm[];
  onShowPage: (page: number) => void;
}) {
  const t = useScopedI18n("admin.import");
  const tAdmin = useScopedI18n("admin");
  const review = useMutation(api.manufacturers.normImports.review);
  const { run, error, pending } = useRun();
  const blocked = norms.some((norm) =>
    norm.checks.some((check) => check.level === "error"),
  );
  // What the norm includes is written once per article.
  const scope = norms[0];

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-primary">
            {article.baseCode} · {article.title}
          </h2>
          <div className="flex flex-wrap gap-2 text-xs text-primary/50">
            <span>{article.unit}</span>
            {article.pages.length > 0 && (
              <button
                type="button"
                className="underline underline-offset-2 hover:text-primary"
                onClick={() => onShowPage(article.pages[0] ?? 1)}
              >
                {t("pages", { pages: article.pages.join(", ") })}
              </button>
            )}
          </div>
        </div>
        {norms.length > 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || blocked}
              onClick={() =>
                run(() =>
                  review({
                    normImportId,
                    baseCode: article.baseCode,
                    decision: "approved",
                  }),
                )
              }
            >
              {t("approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() =>
                  review({
                    normImportId,
                    baseCode: article.baseCode,
                    decision: "rejected",
                  }),
                )
              }
            >
              {t("reject")}
            </Button>
          </div>
        )}
      </div>
      <ErrorText error={error} />
      {(scope?.includes || scope?.excludes) && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs text-primary/60">
          {scope.includes && (
            <>
              <dt className="font-medium">{t("includes")}</dt>
              <dd>{scope.includes}</dd>
            </>
          )}
          {scope.excludes && (
            <>
              <dt className="font-medium">{t("excludes")}</dt>
              <dd>{scope.excludes}</dd>
            </>
          )}
        </dl>
      )}
      {norms.length === 0 ? (
        <p className="text-sm text-primary/50">{t("pending")}</p>
      ) : (
        norms.map((norm) => (
          <div
            key={norm._id}
            className="flex flex-col gap-2 border-t border-border pt-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium text-primary">
                {norm.code}
              </span>
              <Pill tone={normTone[norm.status]}>
                {tAdmin(`status.norm.${norm.status}`)}
              </Pill>
              <span className="text-sm text-primary/70">{norm.title}</span>
            </div>
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-primary/50">
                  <tr>
                    <th className="px-2 py-1">{t("columns.kind")}</th>
                    <th className="px-2 py-1">{t("columns.name")}</th>
                    <th className="px-2 py-1 text-right">
                      {t("columns.quantity")}
                    </th>
                    <th className="px-2 py-1">{t("columns.unit")}</th>
                    <th className="px-2 py-1 text-right">
                      {t("columns.unitPrice")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {norm.resources.map((resource, index) => (
                    <tr
                      // Resources have no id; their order is the document's.
                      // biome-ignore lint/suspicious/noArrayIndexKey: see above
                      key={index}
                      className="border-t border-border/60"
                    >
                      <td className="px-2 py-1 text-primary/60">
                        {tAdmin(`resourceKind.${resource.kind}`)}
                      </td>
                      <td className="px-2 py-1 text-primary/80">
                        {resource.name}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {resource.quantity}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1",
                          resource.unit !== resource.unitRaw &&
                            "text-primary/60",
                        )}
                        title={resource.unitRaw}
                      >
                        {resource.unit}
                      </td>
                      <td className="px-2 py-1 text-right font-mono text-primary/60">
                        {resource.unitPrice ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-x-4 text-xs text-primary/50">
              {norm.totalLaborHours !== undefined && (
                <span>{t("totalLabor", { hours: norm.totalLaborHours })}</span>
              )}
              {norm.totalPrice !== undefined && (
                <span>{t("totalPrice", { price: norm.totalPrice })}</span>
              )}
            </div>
            {norm.checks.length > 0 && <IssueList issues={norm.checks} />}
          </div>
        ))
      )}
    </section>
  );
}
