"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { Label } from "@devize/ui/label";
import { PageHeader } from "@devize/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { toast } from "@devize/ui/sonner";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useRouteParam } from "@/components/use-route-param";
import { estimateCode, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { LinesCard } from "./lines-card";
import { RecapCompareCard } from "./recap-compare-card";
import { SummaryCard } from "./summary-card";
import { useSummaryText } from "./use-summary-text";

/**
 * Comparare revizii: what changed between two revisions of a Deviz, in its
 * Recapitulație and article by article, with a summary to send the client.
 * It compares with the revision named in ?with=, or the one before.
 */
export function ComparePage() {
  const estimateId = useRouteParam("estimateId") as Id<"estimates">;
  const t = useScopedI18n("compare");
  const tEstimate = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const router = useRouter();
  const params = useSearchParams();
  // Kept as the page opened, since a page left hidden follows the address.
  const [asked, setAsked] = useState(() => params.get("with"));
  const revisions = useQuery(api.estimates.estimates.revisions, {
    estimateId,
  });
  const current = revisions?.find((revision) => revision._id === estimateId);
  const others = (revisions ?? []).filter(
    (revision) => revision._id !== estimateId,
  );
  const earlier = others.filter(
    (revision) => current && revision.revision < current.revision,
  );
  const withId =
    others.find((revision) => revision._id === asked)?._id ??
    (earlier.at(-1) ?? others[0])?._id;
  const comparison = useQuery(
    api.estimates.compare.compare,
    withId ? { estimateId, withId } : "skip",
  );
  const summary = useSummaryText(comparison);

  if (revisions === undefined || !current) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const code = estimateCode(current.number, current.revision);
  const choose = (id: string) => {
    setAsked(id);
    router.replace(`/estimates/${estimateId}/compare?with=${id}`, {
      scroll: false,
    });
  };
  const copy = async () => {
    if (!summary) {
      return;
    }
    try {
      await navigator.clipboard.writeText(summary);
      toast.success(t("copied"));
    } catch {
      toast.error(summary);
    }
  };

  const header = (
    <PageHeader
      breadcrumb={
        <Breadcrumb aria-label={tEstimate("breadcrumb")}>
          <BreadcrumbLink asChild>
            <Link href="/estimates">{tEstimate("breadcrumbList")}</Link>
          </BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbLink asChild>
            <Link href={`/estimates/${estimateId}`}>{code}</Link>
          </BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbPage>{t("breadcrumb")}</BreadcrumbPage>
        </Breadcrumb>
      }
      title={t("title")}
      description={
        comparison
          ? t("description", {
              before: estimateCode(
                comparison.number,
                comparison.before.revision,
              ),
              after: estimateCode(comparison.number, comparison.after.revision),
              title: comparison.after.title,
            })
          : current.title
      }
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href={`/estimates/${estimateId}`}>{t("backToEstimate")}</Link>
          </Button>
          {comparison && (
            <Button type="button" onClick={copy}>
              <Icons.Copy aria-hidden />
              {t("copy")}
            </Button>
          )}
        </>
      }
    />
  );

  if (others.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Icons.Deviz />}
          title={t("singleTitle")}
          description={t("singleDescription")}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="compare-with">{t("with")}</Label>
        <Select value={withId} onValueChange={choose}>
          <SelectTrigger id="compare-with" className="w-auto min-w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {others.map((revision) => (
              <SelectItem key={revision._id} value={revision._id}>
                {t("option", {
                  code: estimateCode(revision.number, revision.revision),
                  total: formatMoney(revision.total, locale),
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {comparison === undefined ? (
        <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
      ) : (
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
          <div className="grid min-w-0 gap-6">
            <RecapCompareCard comparison={comparison} />
            <LinesCard comparison={comparison} />
          </div>
          {/* The difference first on a phone, beside the details on a wide screen. */}
          <div className="order-first grid min-w-0 gap-6 xl:order-none">
            <SummaryCard comparison={comparison} />
          </div>
        </div>
      )}
    </>
  );
}
