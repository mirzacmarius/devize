"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouteParam } from "@/components/use-route-param";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  ExternalLink,
  Field,
  IssueList,
  importTone,
  Pill,
  type Tone,
  useFormat,
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

const consentInputId = "consent_note";

/** Brings the consent field into view and puts the cursor in it. */
function focusConsent() {
  const input = document.getElementById(consentInputId);
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  input?.focus({ preventScroll: true });
}

export default function NormImportPage() {
  const t = useScopedI18n("admin.import");
  const tAdmin = useScopedI18n("admin");
  const format = useFormat();
  const normImportId = useRouteParam("normImportId") as Id<"normImports">;
  const data = useQuery(api.manufacturers.normImports.get, { normImportId });
  const [page, setPage] = useState<number | undefined>();

  if (data === undefined) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary/40" />;
  }
  if (data === null) {
    return <p className="text-sm text-primary/60">{t("notFound")}</p>;
  }

  const { normImport, consentBy, norms, fileUrl } = data;
  const byArticle = new Map<string, Norm[]>();
  for (const norm of norms) {
    byArticle.set(norm.baseCode, [
      ...(byArticle.get(norm.baseCode) ?? []),
      norm,
    ]);
  }
  const count = (status: Norm["status"]) =>
    norms.filter((norm) => norm.status === status).length;
  const published = norms.filter((norm) => norm.publishedAt !== null).length;
  const compared = norms.filter((norm) => norm.printedTotal !== null).length;
  const differing = norms.filter(
    (norm) => norm.printedTotal && !norm.printedTotal.matches,
  ).length;
  // Totals that mostly disagree with the document's own unit prices were
  // worked out with other prices; a few point to misread rows.
  const mostDiffer = differing * 2 > compared;

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
            <span>
              {t("laborRate", { rate: format.number(normImport.laborRate) })}
            </span>
          )}
          <span>
            {t("summary", {
              approved: count("approved"),
              rejected: count("rejected"),
              total: norms.length,
            })}
          </span>
          {published > 0 && (
            <span>{t("inCatalogCount", { count: published })}</span>
          )}
          {fileUrl && (
            <ExternalLink href={fileUrl}>{t("openPdf")}</ExternalLink>
          )}
        </div>
        <p className="text-sm text-primary/50">{t("catalogNote")}</p>
        {differing > 0 && (
          <p className="max-w-3xl rounded-md bg-primary/5 p-3 text-sm text-primary/70">
            {t(mostDiffer ? "totalsDiffer.most" : "totalsDiffer.few", {
              count: differing,
              total: compared,
            })}
          </p>
        )}
        <Consent normImport={normImport} consentBy={consentBy} />
        <Publish
          normImportId={normImport._id}
          norms={norms}
          consented={normImport.consent !== undefined}
        />
      </div>

      <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {normImport.articles.map((article) => (
            <Article
              key={article.baseCode}
              normImportId={normImport._id}
              article={article}
              norms={byArticle.get(article.baseCode) ?? []}
              mostDiffer={mostDiffer}
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

/**
 * The manufacturer's written agreement to publish the document's norms, which
 * a super admin records before anything goes into the catalog. Until it's on
 * record the form stands out, since publishing waits on it.
 */
function Consent({
  normImport,
  consentBy,
}: {
  normImport: ImportData["normImport"];
  consentBy: string | null;
}) {
  const t = useScopedI18n("admin.import.consent");
  const record = useMutation(api.manufacturers.normImports.recordConsent);
  const format = useFormat();
  const { run, error, pending } = useRun();
  const { consent } = normImport;
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");

  if (consent && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Pill tone="success">{t("recorded")}</Pill>
        <span className="text-primary/80">{consent.note}</span>
        <span className="text-primary/50">
          {consentBy
            ? t("recordedBy", {
                name: consentBy,
                date: format.date(consent.recordedAt),
              })
            : format.date(consent.recordedAt)}
        </span>
        <button
          type="button"
          className="text-primary/60 underline underline-offset-2 hover:text-primary"
          onClick={() => {
            setNote(consent.note);
            setEditing(true);
          }}
        >
          {t("edit")}
        </button>
      </div>
    );
  }
  return (
    <form
      className={cn(
        "flex max-w-2xl flex-col gap-2",
        !consent && "rounded-md bg-amber-500/10 p-3",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          await record({ normImportId: normImport._id, note });
          setEditing(false);
        });
      }}
    >
      {!consent && (
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {t("missing")}
        </p>
      )}
      <Field label={t("label")} htmlFor={consentInputId}>
        <Input
          id={consentInputId}
          value={note}
          maxLength={500}
          required
          placeholder={t("placeholder")}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <p className="text-xs text-primary/50">{t("hint")}</p>
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          className="w-fit"
          disabled={pending || !note.trim()}
        >
          {t("save")}
        </Button>
        {consent && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(false)}
          >
            {t("cancel")}
          </Button>
        )}
      </div>
      <ErrorText error={error} />
    </form>
  );
}

/**
 * Publishes the approved rows that aren't in the catalog yet, one article per
 * call so a long document stays within a mutation's limits. Only once the
 * manufacturer's consent is recorded.
 */
function Publish({
  normImportId,
  norms,
  consented,
}: {
  normImportId: Id<"normImports">;
  norms: Norm[];
  consented: boolean;
}) {
  const t = useScopedI18n("admin.import.publish");
  const publish = useMutation(api.catalog.publishing.publishImportedNorms);
  const { run, error, pending } = useRun();
  const [result, setResult] = useState<{
    published: number;
    skipped: number;
  } | null>(null);
  const waiting = norms.filter(
    (norm) => norm.status === "approved" && norm.publishedAt === null,
  );
  const articles = [...new Set(waiting.map((norm) => norm.baseCode))];

  const publishAll = () =>
    run(async () => {
      const total = { published: 0, skipped: 0 };
      setResult(null);
      for (const baseCode of articles) {
        const done = await publish({ normImportId, baseCode });
        total.published += done.published;
        total.skipped += done.skipped;
        setResult({ ...total });
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          className="w-fit"
          disabled={pending || !consented || articles.length === 0}
          onClick={publishAll}
        >
          {t("button", { count: waiting.length })}
        </Button>
        {!consented && articles.length > 0 && (
          <button
            type="button"
            className="text-sm text-primary/60 underline underline-offset-2 hover:text-primary"
            onClick={focusConsent}
          >
            {t("needsConsent")}
          </button>
        )}
        {result && (
          <span className="text-sm text-primary/60" role="status">
            {t("result", result)}
          </span>
        )}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

function Article({
  normImportId,
  article,
  norms,
  mostDiffer,
  onShowPage,
}: {
  normImportId: Id<"normImports">;
  article: ImportData["normImport"]["articles"][number];
  norms: Norm[];
  mostDiffer: boolean;
  onShowPage: (page: number) => void;
}) {
  const t = useScopedI18n("admin.import");
  const tAdmin = useScopedI18n("admin");
  const review = useMutation(api.manufacturers.normImports.review);
  const format = useFormat();
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
              {norm.publishedAt !== null && (
                <span title={format.date(norm.publishedAt)}>
                  <Pill tone="info">{t("inCatalog")}</Pill>
                </span>
              )}
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
                        {format.number(resource.quantity)}
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
                        {resource.unitPrice === undefined
                          ? ""
                          : format.number(resource.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <NormTotals norm={norm} mostDiffer={mostDiffer} />
            {norm.checks.length > 0 && <IssueList issues={norm.checks} />}
          </div>
        ))
      )}
    </section>
  );
}

/**
 * A norm's printed totals, and what its own quantities and unit prices add up
 * to when that's different. Marked when only a few variants differ, since
 * then it's more likely a misread row than the document's pricing.
 */
function NormTotals({ norm, mostDiffer }: { norm: Norm; mostDiffer: boolean }) {
  const t = useScopedI18n("admin.import");
  const format = useFormat();
  const check = norm.printedTotal;
  const computed =
    check && !check.matches
      ? t("computedPrice", {
          price: format.lei(check.computed),
          difference: format.change(check.difference),
        })
      : null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary/50">
      {norm.totalLaborHours !== undefined && (
        <span>
          {t("totalLabor", { hours: format.number(norm.totalLaborHours) })}
        </span>
      )}
      {norm.totalPrice !== undefined && (
        <span>{t("totalPrice", { price: format.lei(norm.totalPrice) })}</span>
      )}
      {computed &&
        (mostDiffer ? (
          <span>{computed}</span>
        ) : (
          <Pill tone="warning">{computed}</Pill>
        ))}
    </div>
  );
}
