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
import Link from "next/link";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Amount } from "@/components/amount";
import { DocumentsCard } from "@/components/documents/documents-card";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { TotalHero } from "@/components/total-hero";
import { useRouteParam } from "@/components/use-route-param";
import {
  estimateCode,
  formatCalendarDate,
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
import { runChecks } from "./checks";
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
  const railOrder =
    status === "accepted"
      ? [rail.progress, rail.invoices, rail.offer, rail.checks]
      : status === "draft"
        ? [rail.checks, rail.offer, rail.invoices]
        : [rail.offer, rail.invoices, rail.checks];

  return (
    <>
      <ScrolledBar
        target={hero}
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
                <span className="mb-1.5 block sm:hidden">{statusPill}</span>
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
        {/* Beside the title; on a phone, in a bar at the screen's foot with the
            total, like the client's own Ofertă. */}
        <div className="flex flex-wrap items-center gap-2 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-40 max-sm:flex-nowrap max-sm:border-t max-sm:border-border max-sm:bg-card/95 max-sm:px-4 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:pt-3 max-sm:backdrop-blur sm:order-last md:order-none md:self-start md:pt-7">
          <div className="min-w-0 flex-1 sm:hidden">
            <p className="m-0 truncate text-body-lg font-medium tabular-nums text-ink">
              <Amount value={total} />{" "}
              <span className="text-meta font-normal text-ink-3">lei</span>
            </p>
            <p className="m-0 truncate text-meta tabular-nums text-ink-3">
              {withoutVat}
            </p>
          </div>
          <EstimateActions
            estimate={estimate}
            failedChecks={
              checks.filter((check) => check.state === "failed").length
            }
            open={setPanel}
          />
        </div>
        <div
          ref={hero}
          className="grid gap-x-10 gap-y-3 max-sm:hidden md:col-span-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end"
        >
          <TotalHero
            label={t("summary.total")}
            total={total}
            note={withoutVat}
          />
          <EstimateStepper estimate={estimate} />
        </div>
        <SectionLinks estimate={estimate} />
      </div>
      <div className="grid items-start gap-6 max-sm:pb-20 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
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
        <div className="rail-sections grid min-w-0 gap-6 xl:gap-0">
          {railOrder}
          <CompatibilityCard estimate={estimate} editable={editable} />
          <TakeoffCard estimate={estimate} />
          <PackagingCard estimateId={estimate._id} />
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
  target,
  code,
  title,
  total,
}: {
  target: RefObject<HTMLElement | null>;
  code: string;
  title: string;
  total: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShown(entry ? !entry.isIntersecting : false),
      { rootMargin: "-44px 0px 0px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);
  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b border-border bg-panel/95 backdrop-blur transition-opacity duration-150 ease-out max-sm:hidden md:left-sidebar md:right-2",
        shown ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="mx-auto flex h-11 max-w-[1536px] items-center justify-between gap-6 px-4 md:px-8">
        <p className="m-0 min-w-0 truncate text-body">
          <span className="tabular-nums text-ink-3">{code}</span>
          <span className="ml-2 font-medium text-ink">{title}</span>
        </p>
        <p className="m-0 shrink-0 text-body-lg tabular-nums text-ink">
          <Amount value={total} />{" "}
          <span className="text-meta text-ink-3">lei</span>
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
function SectionLinks({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("estimate.jump");
  const locale = useCurrentLocale();
  const accepted = estimate.status === "accepted";
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
  const figures: Partial<Record<(typeof sections)[number], string>> = {
    progress:
      work && work.statements.length > 0
        ? formatPercent(Math.round(work.executed.percent * 10) / 10, locale)
        : undefined,
    invoices:
      billing && billing.invoicedNet > 0
        ? `${formatMoney(billing.invoicedNet, locale)} lei`
        : undefined,
  };
  return (
    <nav
      aria-label={t("label")}
      className="order-last -mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:col-span-2 md:mx-0 md:px-0 xl:hidden"
    >
      {sections.map((section) => (
        <a
          key={section}
          href={`#${section}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-tile px-3 text-meta font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t(section)}
          {figures[section] && (
            <span className="font-normal tabular-nums text-ink-3">
              {figures[section]}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}
