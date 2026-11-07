"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { PageHeader } from "@devize/ui/page-header";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Lei } from "@/components/amount";
import { DocumentsCard } from "@/components/documents/documents-card";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { RailGroup, RailLabel } from "@/components/fold-card";
import { Rail, RailList, RailSummary } from "@/components/rail-stat";
import { TotalHero } from "@/components/total-hero";
import { useRouteParam } from "@/components/use-route-param";
import { useScrolledPast } from "@/components/use-scrolled-past";
import {
  estimateCode,
  formatCalendarDate,
  formatDay,
  formatMoney,
  formatPercent,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { InvoicesCard, InvoicesRow } from "../_invoices/invoices-card";
import { PackagingCard } from "../_materials/packaging-card";
import { OfferCard } from "../_offer/offer-card";
import { OfferDialog } from "../_offer/offer-dialog";
import { ProgressCard } from "../_progress/progress-card";
import { OmissionsSheet } from "../_proposal/omissions-sheet";
import { ProposalBanner } from "../_proposal/proposal-banner";
import { ProposalSheet } from "../_proposal/proposal-sheet";
import { CompatibilityCard } from "../_systems/compatibility-card";
import { TakeoffCard } from "../_takeoff/takeoff-card";
import { AddNormSheet } from "./add-norm-sheet";
import { type Check, runChecks } from "./checks";
import { ChecksCard } from "./checks-card";
import { CustomItemDialog } from "./custom-item-dialog";
import { DetailsCard } from "./details-card";
import { DetailsSheet } from "./details-sheet";
import { EstimateActions } from "./estimate-actions";
import { EstimateStepper } from "./estimate-stepper";
import { ItemDialog } from "./item-dialog";
import { LineItemsCard } from "./line-items-card";
import { MarkupsDialog } from "./markups-dialog";
import { RecapCard } from "./recap-card";
import { RevisionsCard } from "./revisions-card";
import { SectionDialog } from "./section-dialog";
import { TargetPriceDialog } from "./target-dialog";
import type { Estimate, Panel } from "./types";

/**
 * A Deviz: its line items by section, the Recapitulație and, on the right,
 * the checks to pass before it goes to the client. A sent Deviz is read-only.
 */
export function EstimatePage() {
  const estimateId = useRouteParam("estimateId") as Id<"estimates">;
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const estimate = useQuery(api.estimates.estimates.get, { estimateId });
  const updates = useQuery(api.estimates.estimates.checkUpdates, {
    estimateId,
  });
  const omissions = useQuery(api.proposals.omissions.latest, { estimateId });
  const details = useQuery(
    api.accounts.organizations.get,
    estimate ? { organizationId: estimate.organizationId } : "skip",
  );
  const setActive = useMutation(api.accounts.organizations.setActive);
  const [panel, setPanel] = useState<Panel | null>(null);
  const synced = useRef<string | null>(null);
  const hero = useRef<HTMLDivElement>(null);
  const pastHero = useScrolledPast(hero, estimate !== undefined);

  // A link to a Deviz of another of the user's firms switches to that firm,
  // once, so the clients and rates offered here are the Deviz's own.
  useEffect(() => {
    if (!estimate || synced.current === estimate._id) {
      return;
    }
    synced.current = estimate._id;
    if (estimate.organizationId !== firm._id) {
      void setActive({ organizationId: estimate.organizationId });
    }
  }, [estimate, firm._id, setActive]);

  if (estimate === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const editable = estimate.lockedAt === undefined;
  const code = estimateCode(estimate.number, estimate.revision);
  const checks = runChecks({
    lineItems: estimate.lineItems,
    tender: estimate.kind === "tender",
    omissions,
    client: estimate.client,
    vat: estimate.markups.vat,
    vatPayer: details?.vatPayer,
    updates,
  });
  const close = () => setPanel(null);
  const total = formatMoney(estimate.totals.total, locale);
  const withoutVat = t("summary.withoutVat", {
    total: formatMoney(estimate.totals.subtotal, locale),
  });
  const { status } = estimate;
  const statusPill = <EstimateStatusPill status={status} />;
  const answered = status === "accepted" || status === "rejected";

  // The rail leads with what comes next for where this Deviz is at.
  const rail = {
    checks: (
      <ChecksCard
        key="checks"
        estimate={estimate}
        checks={checks}
        updates={updates}
        editable={editable}
        open={setPanel}
        folded={status !== "draft"}
      />
    ),
    offer: (
      <OfferCard
        key="offer"
        estimate={estimate}
        onCreate={() => setPanel({ kind: "offer" })}
      />
    ),
    progress: <ProgressCard key="progress" estimate={estimate} />,
    invoices: <InvoicesCard key="invoices" estimate={estimate} />,
  };
  const preparation = (
    <>
      <CompatibilityCard estimate={estimate} editable={editable} />
      <TakeoffCard estimate={estimate} />
    </>
  );
  const packaging = <PackagingCard estimateId={estimate._id} />;
  const records = (
    <>
      <DocumentsCard estimate={estimate} />
      <DetailsCard estimate={estimate} editable={editable} open={setPanel} />
      <RevisionsCard estimate={estimate} />
    </>
  );
  // What the Deviz is at first; the rest in a quiet list of rows.
  const railLead = (
    <RailSummary>
      {status === "accepted"
        ? rail.progress
        : status === "draft"
          ? rail.checks
          : rail.offer}
      {rail.invoices}
    </RailSummary>
  );

  return (
    <>
      <ScrolledBar
        shown={pastHero}
        code={code}
        title={estimate.title}
        total={total}
      />
      <div className="grid min-w-0 gap-x-4 gap-y-3 sm:gap-y-5 md:grid-cols-[minmax(0,1fr)_auto]">
        {/* Who it's for and where it stands, one under the other; the total on its own. */}
        <div className="grid min-w-0 gap-2.5">
          <PageHeader
            breadcrumb={
              <Breadcrumb aria-label={t("breadcrumb")}>
                <BreadcrumbLink asChild>
                  <Link href="/estimates">{t("breadcrumbList")}</Link>
                </BreadcrumbLink>
                <BreadcrumbSeparator />
                <BreadcrumbPage>{code}</BreadcrumbPage>
              </Breadcrumb>
            }
            title={estimate.title}
            // Until it's answered the stepper says where it stands.
            status={
              answered ? (
                <>
                  {statusPill}
                  <span className="ml-1.5 text-meta text-ink-3 max-sm:hidden">
                    {formatDay(estimate.updatedAt, locale)}
                  </span>
                </>
              ) : status === "archived" ? (
                statusPill
              ) : undefined
            }
            description={
              <>
                {!answered && status !== "archived" && (
                  <span className="sm:hidden">
                    {statusPill}
                    {" · "}
                  </span>
                )}
                {estimate.client?.name ?? t("noClient")}
                {/* A phone keeps the line to one row; the Deviz's data has the date. */}
                <span className="max-sm:hidden">
                  {" · "}
                  {t("pricesOf", {
                    date: formatCalendarDate(estimate.priceDate, locale),
                  })}
                </span>
              </>
            }
          />
          {/* The status pill says where it stands; a phone gets to the work sooner. */}
          <EstimateStepper
            estimate={estimate}
            className="max-sm:hidden min-[1400px]:hidden"
          />
        </div>
        {/* Beside the title; on a phone, in a bar at the screen's foot, with the
            total once the one above has scrolled away. */}
        <div className="flex flex-wrap items-center gap-2 max-sm:foot-bar max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-40 max-sm:flex-nowrap max-sm:[&>*]:h-11 max-sm:[&>*]:min-w-11 max-sm:bg-card max-sm:px-4 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:pt-3 sm:order-last md:order-none md:self-start md:pt-7 min-[1400px]:relative">
          {pastHero && (
            <div className="min-w-0 flex-1 max-sm:!h-auto sm:hidden">
              <p className="m-0 truncate text-body-lg font-medium tabular-nums text-ink">
                {total}{" "}
                <span className="text-meta font-normal text-ink-3">lei</span>
              </p>
              <p className="m-0 truncate text-meta tabular-nums text-ink-3">
                {withoutVat}
              </p>
            </div>
          )}
          <EstimateActions
            estimate={estimate}
            failedChecks={
              checks.filter((check) => check.state === "failed").length
            }
            open={setPanel}
            fill={!pastHero}
          />
          {/* Where there's room it stands under the actions, on the client's line. */}
          <EstimateStepper
            estimate={estimate}
            className="absolute right-0 top-full mt-0.5 hidden w-max flex-nowrap min-[1400px]:flex"
          />
        </div>
      </div>
      <div
        data-past-hero={pastHero || undefined}
        className="-mt-1 grid items-start gap-6 max-sm:pb-20 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)] xl:gap-x-11"
      >
        <div className="grid min-w-0 gap-6">
          {/* Level with the rail's top: the two things the page comes down to. */}
          <div ref={hero}>
            <TotalHero
              label={t("summary.total")}
              total={total}
              note={withoutVat}
            />
          </div>
          <SectionLinks estimate={estimate} checks={checks} />
          {editable && (
            <ProposalBanner
              estimateId={estimate._id}
              onOpen={() => setPanel({ kind: "proposal" })}
            />
          )}
          <LineItemsCard
            estimate={estimate}
            updates={updates}
            editable={editable}
            open={setPanel}
          />
          <RecapCard estimate={estimate} editable={editable} open={setPanel} />
        </div>
        {/* Stays in sight beside a long Deviz, under the bar that keeps the total. */}
        <Rail sticky>
          {railLead}
          {/* While it's a draft, its preparation is the work; once it has left,
              one row. The summary takes what leads. */}
          <RailList>
            {status === "draft" ? (
              <>
                <RailLabel>{t("rail.preparation")}</RailLabel>
                {preparation}
                {packaging}
                <RailLabel>{t("rail.records")}</RailLabel>
              </>
            ) : (
              <>
                <RailGroup title={t("rail.preparation")}>
                  {rail.checks}
                  {preparation}
                  {packaging}
                </RailGroup>
                <RailLabel className="xl:hidden">{t("rail.records")}</RailLabel>
              </>
            )}
            <InvoicesRow estimate={estimate} />
            {(status === "draft" || status === "accepted") && rail.offer}
            {records}
          </RailList>
        </Rail>
      </div>

      <DetailsSheet
        estimate={estimate}
        open={panel?.kind === "details"}
        onClose={close}
      />
      <OfferDialog
        estimate={estimate}
        open={panel?.kind === "offer"}
        onClose={close}
      />
      <MarkupsDialog
        estimate={estimate}
        open={panel?.kind === "markups"}
        onClose={close}
      />
      <TargetPriceDialog
        estimate={estimate}
        open={panel?.kind === "target"}
        onClose={close}
      />
      <ProposalSheet
        estimate={estimate}
        open={panel?.kind === "proposal"}
        onClose={close}
      />
      <OmissionsSheet
        estimate={estimate}
        open={panel?.kind === "omissions"}
        onClose={close}
      />
      <AddNormSheet
        estimate={estimate}
        open={panel?.kind === "addNorm"}
        sectionId={panel?.kind === "addNorm" ? panel.sectionId : undefined}
        onClose={close}
        onCustom={(sectionId) => setPanel({ kind: "custom", sectionId })}
      />
      <CustomItemDialog
        estimate={estimate}
        open={panel?.kind === "custom"}
        sectionId={panel?.kind === "custom" ? panel.sectionId : undefined}
        onClose={close}
      />
      <ItemDialog
        item={panel?.kind === "item" ? panel.item : null}
        onClose={close}
      />
      <SectionDialog
        estimate={estimate}
        panel={
          panel?.kind === "section" || panel?.kind === "newSection"
            ? panel
            : null
        }
        onClose={close}
      />
    </>
  );
}

/**
 * Once the total has scrolled away, the line that keeps it in sight: a long
 * Deviz is read a long way below its header. A phone has its bar at the foot.
 */
function ScrolledBar({
  shown,
  code,
  title,
  total,
}: {
  shown: boolean;
  code: string;
  title: string;
  total: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b border-border bg-panel transition-opacity duration-150 ease-out max-sm:hidden lg:left-sidebar lg:right-2",
        shown ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="mx-auto flex h-11 max-w-[1536px] items-center justify-between gap-6 px-4 md:px-8">
        <p className="m-0 min-w-0 truncate text-body">
          <span className="tabular-nums text-ink-3">{code}</span>
          <span className="ml-2 font-medium text-ink">{title}</span>
        </p>
        <p className="m-0 shrink-0 text-body-lg tabular-nums text-ink">
          {total} <span className="text-meta text-ink-3">lei</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Until the rail sits beside the Articole it comes after them all: the way to
 * what's down there, by what the Deviz is at, and, once it's in execution, how
 * far along each part is.
 */
function SectionLinks({
  estimate,
  checks,
}: {
  estimate: Estimate;
  checks: Check[];
}) {
  const t = useScopedI18n("estimate");
  const tOffer = useScopedI18n("offer");
  const locale = useCurrentLocale();
  const accepted = estimate.status === "accepted";
  const offer = useQuery(api.offers.offers.forEstimate, {
    estimateId: estimate._id,
  });
  const work = useQuery(
    api.progress.statements.forEstimate,
    accepted ? { estimateId: estimate._id } : "skip",
  );
  const billing = useQuery(
    api.invoices.invoices.forEstimate,
    accepted ? { estimateId: estimate._id } : "skip",
  );
  const sections = accepted
    ? (["progress", "invoices", "offer", "documents"] as const)
    : estimate.status === "draft"
      ? (["checks", "recap", "offer", "documents"] as const)
      : (["offer", "recap", "checks", "documents"] as const);
  const passed = checks.filter((check) => check.state === "passed").length;
  const signedAt = offer?.signature?.signedAt ?? offer?.decidedAt;
  // Every cell says the same two things: what it is and where it stands.
  const cells: Record<
    (typeof sections)[number],
    { label?: string; value?: ReactNode }
  > = {
    progress: {
      value:
        work && work.statements.length > 0
          ? formatPercent(Math.round(work.executed.percent * 10) / 10, locale)
          : t("jump.noStatements"),
    },
    invoices: {
      label: billing?.accepted ? t("jump.toInvoice") : undefined,
      value: billing?.accepted ? (
        <Lei value={formatMoney(billing.remainingNet ?? 0, locale)} />
      ) : (
        "–"
      ),
    },
    checks: {
      value:
        passed < checks.length
          ? checks.length - passed === 1
            ? t("checks.leftOne", { total: checks.length })
            : t("checks.left", {
                left: checks.length - passed,
                total: checks.length,
              })
          : t("checks.score", { passed, total: checks.length }),
    },
    recap: { value: t("jump.recapValue") },
    offer: {
      value:
        offer === null || offer === undefined
          ? tOffer("notCreated")
          : offer.status === "accepted" && signedAt !== undefined
            ? tOffer("acceptedLead", { date: formatDay(signedAt, locale) })
            : tOffer(`status.${offer.status}`),
    },
    documents: { value: t("jump.documentsValue") },
  };
  return (
    <nav
      aria-label={t("jump.label")}
      className="grid grid-cols-2 border-t border-border max-sm:-mx-4 max-sm:-mb-6 max-sm:-mt-3 sm:-mt-1 md:grid-cols-4 md:border-b xl:hidden"
    >
      {sections.map((section) => {
        const cell = cells[section];
        return (
          <a
            key={section}
            href={`#${section}`}
            className="flex min-h-14 min-w-0 items-center justify-between gap-2 border-border px-4 py-2 transition-colors max-sm:min-h-[52px] max-sm:py-1.5 hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring max-md:[&:nth-child(even)]:border-l max-md:[&:nth-child(n+3)]:border-t sm:max-md:[&:nth-child(even)]:pr-0 sm:max-md:[&:nth-child(odd)]:pl-0 md:gap-1 md:px-3 md:first:pl-0 md:last:pr-0 md:[&:not(:first-child)]:border-l"
          >
            <span className="grid min-w-0">
              <span className="truncate text-meta text-ink-3">
                {cell.label ?? t(`jump.${section}`)}
              </span>
              <span className="truncate text-body tabular-nums text-ink">
                {cell.value}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="-mr-[5px] size-4 shrink-0 text-ink-3"
            />
          </a>
        );
      })}
    </nav>
  );
}
