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
import { useEffect, useRef, useState } from "react";
import { DocumentsCard } from "@/components/documents/documents-card";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { RailLabel } from "@/components/fold-card";
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
import { InvoicesCard } from "../_invoices/invoices-card";
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
  // What the Deviz is at first; the rest in one quiet list of rows.
  const railLead =
    status === "accepted"
      ? [rail.progress, rail.invoices]
      : status === "draft"
        ? [rail.checks, rail.invoices]
        : [rail.offer, rail.invoices];

  return (
    <>
      <ScrolledBar
        shown={pastHero}
        code={code}
        title={estimate.title}
        total={total}
      />
      <div className="grid min-w-0 gap-x-4 gap-y-3 sm:gap-y-5 md:grid-cols-[minmax(0,1fr)_auto]">
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
          // The stepper says where it stands, and an archived one has none.
          status={status === "archived" ? statusPill : undefined}
          description={
            <>
              {status !== "archived" && (
                <span className="block sm:hidden">
                  <EstimateStatusPill status={status} />
                </span>
              )}
              {[
                estimate.client?.name ?? t("noClient"),
                t("pricesOf", {
                  date: formatCalendarDate(estimate.priceDate, locale),
                }),
              ].join(" · ")}
            </>
          }
        />
        {/* Beside the title; on a phone, in a bar at the screen's foot, with the
            total once the one above has scrolled away. */}
        <div className="flex flex-wrap items-center gap-2 max-sm:foot-bar max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-40 max-sm:flex-nowrap max-sm:[&>*]:h-11 max-sm:[&>*]:min-w-11 max-sm:bg-card max-sm:px-4 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:pt-3 sm:order-last md:order-none md:self-start md:pt-7">
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
            openChecks={
              checks.filter((check) => check.state !== "passed").length
            }
            open={setPanel}
            fill={!pastHero}
          />
        </div>
        <div
          ref={hero}
          className="grid gap-x-10 gap-y-3 md:col-span-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:[align-items:last_baseline]"
        >
          <TotalHero
            label={t("summary.total")}
            total={total}
            note={withoutVat}
          />
          <EstimateStepper estimate={estimate} />
        </div>
        <SectionLinks estimate={estimate} checks={checks} />
      </div>
      <div
        data-past-hero={pastHero || undefined}
        className="grid items-start gap-6 max-sm:pb-20 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)] xl:gap-x-8"
      >
        <div className="grid min-w-0 gap-6">
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
        <div className="rail-sections grid min-w-0 gap-6 xl:sticky xl:top-14 xl:-mx-1 xl:max-h-[calc(100vh-4.5rem)] xl:gap-0 xl:overflow-y-auto xl:px-1 xl:[scrollbar-width:thin]">
          {railLead}
          <RailLabel>{t("rail.preparation")}</RailLabel>
          {status !== "draft" && rail.checks}
          <CompatibilityCard estimate={estimate} editable={editable} />
          <TakeoffCard estimate={estimate} />
          <PackagingCard estimateId={estimate._id} />
          <RailLabel>{t("rail.records")}</RailLabel>
          {(status === "accepted" || status === "draft") && rail.offer}
          <DocumentsCard estimate={estimate} />
          <DetailsCard
            estimate={estimate}
            editable={editable}
            open={setPanel}
          />
          <RevisionsCard estimate={estimate} />
        </div>
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
        "fixed inset-x-0 top-0 z-30 border-b border-border bg-panel transition-opacity duration-150 ease-out max-sm:hidden md:left-sidebar md:right-2",
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
    { label?: string; value?: string }
  > = {
    progress: {
      value:
        work && work.statements.length > 0
          ? formatPercent(Math.round(work.executed.percent * 10) / 10, locale)
          : t("jump.noStatements"),
    },
    invoices: {
      label: billing?.accepted ? t("jump.toInvoice") : undefined,
      value: billing?.accepted
        ? `${formatMoney(billing.remainingNet ?? 0, locale)} lei`
        : "–",
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
      className="order-last grid grid-cols-2 border-t border-border max-sm:-mx-4 max-sm:-mb-6 md:col-span-2 md:grid-cols-4 md:border-b xl:hidden"
    >
      {sections.map((section) => {
        const cell = cells[section];
        return (
          <a
            key={section}
            href={`#${section}`}
            className="flex min-h-14 min-w-0 items-center justify-between gap-2 border-border px-4 py-2 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring max-md:[&:nth-child(n+3)]:border-t sm:[&:nth-child(odd)]:pl-0 md:[&:nth-child(3)]:pl-4 max-md:[&:nth-child(even)]:border-l md:[&:not(:first-child)]:border-l"
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
