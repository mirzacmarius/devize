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
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DocumentsCard } from "@/components/documents/documents-card";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { estimateCode, formatCalendarDate, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ProposalBanner } from "../_proposal/proposal-banner";
import { ProposalSheet } from "../_proposal/proposal-sheet";
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
import type { Panel } from "./types";

/**
 * A Deviz: its line items by section, the Recapitulație and, on the right,
 * the checks to pass before it goes to the client. A sent Deviz is read-only.
 */
export function EstimatePage({ estimateId }: { estimateId: Id<"estimates"> }) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const estimate = useQuery(api.estimates.estimates.get, { estimateId });
  const updates = useQuery(api.estimates.estimates.checkUpdates, {
    estimateId,
  });
  const details = useQuery(
    api.accounts.organizations.get,
    estimate ? { organizationId: estimate.organizationId } : "skip",
  );
  const setActive = useMutation(api.accounts.organizations.setActive);
  const [panel, setPanel] = useState<Panel | null>(null);
  const synced = useRef<string | null>(null);

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
    client: estimate.client,
    vat: estimate.markups.vat,
    vatPayer: details?.vatPayer,
    updates,
  });
  const close = () => setPanel(null);

  return (
    <>
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
        title={code}
        status={<EstimateStatusPill status={estimate.status} />}
        description={[
          estimate.title,
          estimate.client?.name ?? t("noClient"),
          t("totalWithVat", {
            total: formatMoney(estimate.totals.total, locale),
          }),
          t("pricesOf", {
            date: formatCalendarDate(estimate.priceDate, locale),
          }),
        ].join(" · ")}
        actions={
          <EstimateActions
            estimate={estimate}
            failedChecks={
              checks.filter((check) => check.state === "failed").length
            }
            open={setPanel}
          />
        }
      />
      <EstimateStepper estimate={estimate} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]">
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
        <div className="grid min-w-0 gap-6">
          <ChecksCard
            estimate={estimate}
            checks={checks}
            updates={updates}
            editable={editable}
            open={setPanel}
          />
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
      <MarkupsDialog
        estimate={estimate}
        open={panel?.kind === "markups"}
        onClose={close}
      />
      <ProposalSheet
        estimate={estimate}
        open={panel?.kind === "proposal"}
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
