"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { laborFloor } from "@devize/backend/convex/lib/labor";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import {
  Check,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { FoldCard } from "@/components/fold-card";
import { useRun } from "@/components/use-run";
import { formatAmount, formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { useStartOmissions } from "../_proposal/omissions-sheet";
import type { Check as CheckResult, CheckState } from "./checks";
import { useRefreshedMessage } from "./estimate-actions";
import type { Estimate, OpenPanel, Updates } from "./types";

const stateIcon: Record<CheckState, { icon: typeof Check; className: string }> =
  {
    passed: { icon: Check, className: "text-success" },
    warning: { icon: CircleAlert, className: "text-warning-dot" },
    failed: { icon: TriangleAlert, className: "text-danger" },
    pending: { icon: CircleDashed, className: "text-ink-3" },
  };

// How many missing resources to name before "și încă 3".
const NAMED = 3;

/**
 * The checks a Deviz should pass before it goes to the client, each with what
 * is wrong in numbers and, while it is a draft, the fix one click away.
 */
export function ChecksCard({
  estimate,
  checks,
  updates,
  editable,
  open,
  folded = false,
}: {
  estimate: Estimate;
  checks: CheckResult[];
  updates: Updates | undefined;
  editable: boolean;
  open: OpenPanel;
  // Once the Deviz has left, they are only worth a look now and then.
  folded?: boolean;
}) {
  const t = useScopedI18n("estimate");
  const [showPassed, setShowPassed] = useState(false);
  const passed = checks.filter((check) => check.state === "passed");
  const open_ = checks.filter((check) => check.state !== "passed");
  const row = (check: CheckResult) => (
    <CheckRow
      key={check.id}
      estimate={estimate}
      check={check}
      updates={updates}
      editable={editable}
      open={open}
    />
  );
  const lead =
    open_.length > 0
      ? open_.length === 1
        ? t("checks.leftOne", { total: checks.length })
        : t("checks.left", { left: open_.length, total: checks.length })
      : t("checks.score", { passed: passed.length, total: checks.length });
  const body = (
    <>
      {open_.length > 0 && (
        <ul
          className={cn(
            "m-0 grid list-none gap-3 p-0",
            // In the rail's frame it needs no panel of its own.
            folded
              ? "rounded-lg bg-sunken p-3"
              : "[&>li+li]:border-t [&>li+li]:border-border [&>li+li]:pt-3",
          )}
        >
          {open_.map(row)}
        </ul>
      )}
      {passed.length > 0 && (
        <div className="grid gap-3">
          <button
            type="button"
            aria-expanded={showPassed}
            onClick={() => setShowPassed((value) => !value)}
            className="grid w-fit grid-cols-[16px_minmax(0,1fr)] items-center gap-2.5 rounded-xs text-meta text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 justify-self-center transition-transform",
                showPassed && "rotate-90",
              )}
            />
            {showPassed
              ? t("checks.hidePassed")
              : t("checks.showPassed", { count: passed.length })}
          </button>
          {showPassed && (
            <ul className="m-0 grid list-none gap-3 p-0">{passed.map(row)}</ul>
          )}
        </div>
      )}
    </>
  );
  if (folded) {
    return (
      <FoldCard
        id="checks"
        title={t("checks.title")}
        lead={lead}
        // A Deviz that has left can't be fixed here: it says so, without alarm.
      >
        {body}
      </FoldCard>
    );
  }
  return (
    <Card id="checks" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t("checks.title")}</CardTitle>
        <span className="text-meta tabular-nums text-ink-2">{lead}</span>
      </CardHeader>
      <CardContent className="gap-3">{body}</CardContent>
    </Card>
  );
}

function CheckRow({
  estimate,
  check,
  updates,
  editable,
  open,
}: {
  estimate: Estimate;
  check: CheckResult;
  updates: Updates | undefined;
  editable: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const { title, detail } = useCheckText()(check);
  const { icon: Icon, className } = stateIcon[check.state];
  return (
    <li className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2.5">
      <Icon className={cn("mt-0.5 size-4", className)} aria-hidden />
      <div className="grid min-w-0 justify-items-start">
        <span className="text-body font-medium text-ink">
          <span className="sr-only">{t(`checks.states.${check.state}`)}: </span>
          {title}
        </span>
        <span className="text-meta text-ink-2">{detail}</span>
        {editable &&
          (check.id === "omissions" ? (
            <OmissionsFix estimate={estimate} check={check} open={open} />
          ) : (
            <CheckFix
              estimateId={estimate._id}
              check={check}
              updates={updates}
              open={open}
            />
          ))}
      </div>
    </li>
  );
}

/** What a check found, as a short title and the exact numbers under it. */
function useCheckText() {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const omissions = (
    check: OmissionsCheck,
  ): { title: string; detail: string } => {
    switch (check.status) {
      case "loading":
        return {
          title: t("checks.omissions.noneTitle"),
          detail: t("checks.pending"),
        };
      case "none":
        return {
          title: t("checks.omissions.noneTitle"),
          detail: t("checks.omissions.none"),
        };
      case "working":
        return {
          title: t("checks.omissions.workingTitle"),
          detail: t("checks.omissions.working"),
        };
      case "failed":
        return {
          title: t("checks.omissions.failedTitle"),
          detail: t("checks.omissions.failed"),
        };
      case "found":
        return {
          title: t("checks.omissions.warningTitle"),
          detail: [
            check.works > 0
              ? t("checks.omissions.works", { count: check.works })
              : "",
            check.questions > 0
              ? check.tender
                ? t("checks.omissions.clarifications", {
                    count: check.questions,
                  })
                : t("checks.omissions.questions", { count: check.questions })
              : "",
            check.remarks > 0
              ? t("checks.omissions.remarks", { count: check.remarks })
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
        };
      case "clear":
        return {
          title: t("checks.omissions.title"),
          detail: t("checks.omissions.clear"),
        };
      case "applied":
        return {
          title: t("checks.omissions.title"),
          detail: t("checks.omissions.applied", { count: check.works }),
        };
      case "reviewed":
        return {
          title: t("checks.omissions.title"),
          detail: t("checks.omissions.reviewed"),
        };
    }
  };
  return (check: CheckResult): { title: string; detail: ReactNode } => {
    if (check.id === "omissions") {
      return omissions(check);
    }
    if (check.state === "pending") {
      return {
        title: t(`checks.${check.id}.title`),
        detail: t("checks.pending"),
      };
    }
    switch (check.id) {
      case "items":
        return check.state === "passed"
          ? {
              title: t("checks.items.title"),
              detail: t("checks.items.passed", { count: check.count }),
            }
          : {
              title: t("checks.items.failedTitle"),
              detail: t("checks.items.failed"),
            };
      case "prices": {
        if (check.state === "passed") {
          return {
            title: t("checks.prices.title"),
            detail: t("checks.prices.passed"),
          };
        }
        const named = check.missing.slice(0, NAMED).join(", ");
        const more = check.missing.length - NAMED;
        return {
          title: t("checks.prices.failedTitle"),
          detail:
            more > 0
              ? t("checks.prices.failedMore", { names: named, count: more })
              : t("checks.prices.failed", { names: named }),
        };
      }
      case "labor": {
        const floor = formatMoney(check.floor, locale);
        if (check.state === "passed") {
          return {
            title: t("checks.labor.title"),
            detail: t("checks.labor.passed", { floor }),
          };
        }
        const monthly = formatAmount(laborFloor.monthlyGross, locale);
        const named = check.names.slice(0, NAMED).join(", ");
        const more = check.names.length - NAMED;
        return {
          title: t("checks.labor.warningTitle"),
          detail:
            more > 0
              ? t("checks.labor.warningMore", {
                  floor,
                  monthly,
                  names: named,
                  count: more,
                })
              : t("checks.labor.warning", { floor, monthly, names: named }),
        };
      }
      case "current": {
        if (check.state === "passed") {
          return {
            title: t("checks.current.title"),
            detail: t("checks.current.passed"),
          };
        }
        const amount = formatMoney(Math.abs(check.difference), locale);
        return {
          title: t("checks.current.warningTitle"),
          detail: t("checks.current.warning", {
            count: check.count,
            // The figure to weigh, in a sentence that explains it.
            difference: (
              <span className="font-medium tabular-nums text-ink">
                {check.difference > 0
                  ? `+${amount}`
                  : check.difference < 0
                    ? `−${amount}`
                    : amount}
              </span>
            ),
          }),
        };
      }
      case "norms":
        return check.state === "passed"
          ? {
              title: t("checks.norms.title"),
              detail: t("checks.norms.passed"),
            }
          : {
              title: t("checks.norms.warningTitle"),
              detail: t("checks.norms.warning", { count: check.count }),
            };
      case "ai":
        return check.state === "passed"
          ? { title: t("checks.ai.title"), detail: t("checks.ai.passed") }
          : {
              title: t("checks.ai.warningTitle"),
              detail: t("checks.ai.warning", { count: check.count }),
            };
      case "client":
        return check.state === "passed"
          ? {
              title: t("checks.client.title"),
              detail: check.name ?? "",
            }
          : {
              title: t("checks.client.warningTitle"),
              detail: t("checks.client.warning"),
            };
      case "vat": {
        const vat = formatPercent(check.vat, locale);
        if (check.state === "passed") {
          return {
            title: t("checks.vat.title"),
            detail: check.vatPayer
              ? t("checks.vat.passedPayer", { vat })
              : t("checks.vat.passedNotPayer"),
          };
        }
        return check.state === "warning"
          ? {
              title: t("checks.vat.warningTitle"),
              detail: t("checks.vat.warning"),
            }
          : {
              title: t("checks.vat.failedTitle"),
              detail: t("checks.vat.failed", { vat }),
            };
      }
    }
  };
}

type OmissionsCheck = Extract<CheckResult, { id: "omissions" }>;

/** A check's one-click fix: an action here, or the page where it is fixed. */
type Fix =
  | { label: string; onClick: () => void }
  | { label: string; href: string };

/**
 * The omissions check's button, whatever its state: one click starts a check
 * and shows it working, and any other opens what the check found.
 */
function OmissionsFix({
  estimate,
  check,
  open,
}: {
  estimate: Estimate;
  check: OmissionsCheck;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const { start, starting } = useStartOmissions(estimate._id);
  if (
    check.status === "loading" ||
    (check.status === "none" && estimate.lineItems.length === 0)
  ) {
    return null;
  }
  const label =
    check.status === "none"
      ? t("checks.omissions.start")
      : check.status === "found"
        ? t("checks.omissions.open")
        : t("checks.omissions.view");
  return (
    <Button
      type="button"
      variant="link"
      className={cn(
        "mt-2 justify-self-start",
        check.status === "none" && "text-ai",
      )}
      disabled={starting}
      onClick={async () => {
        if (check.status !== "none" || (await start())) {
          open({ kind: "omissions" });
        }
      }}
    >
      {check.status === "none" && <Icons.AI aria-hidden />}
      {label}
    </Button>
  );
}

/** The one-click fix for a check that didn't pass, when there is one. */
function CheckFix({
  estimateId,
  check,
  updates,
  open,
}: {
  estimateId: Estimate["_id"];
  check: CheckResult;
  updates: Updates | undefined;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const refreshPrices = useMutation(api.estimates.lineItems.refreshPrices);
  const upgradeNorm = useMutation(api.estimates.lineItems.upgradeNorm);
  const refreshedMessage = useRefreshedMessage();
  const run = useRun();
  const [busy, setBusy] = useState(false);

  if (check.state === "passed" || check.state === "pending") {
    return null;
  }

  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    await work();
    setBusy(false);
  };

  const fix = ((): Fix | null => {
    switch (check.id) {
      case "items":
        return {
          label: t("checks.items.fix"),
          onClick: () => open({ kind: "addNorm" }),
        };
      case "labor":
        // The firm's Tarife are where an hour of labour gets its price.
        return { label: t("checks.labor.fix"), href: "/rates" };
      case "current":
        return {
          label: t("checks.current.fix"),
          onClick: () =>
            action(async () => {
              const result = await run(() => refreshPrices({ estimateId }));
              if (result.ok) {
                toast.success(refreshedMessage(result.value));
              }
            }),
        };
      case "norms":
        return {
          label: t("checks.norms.fix"),
          onClick: () =>
            action(async () => {
              // One item at a time, so a failure says which one stopped.
              let upgraded = 0;
              for (const { lineItemId } of updates?.normUpdates ?? []) {
                const result = await run(() => upgradeNorm({ lineItemId }));
                if (!result.ok) {
                  break;
                }
                upgraded++;
              }
              if (upgraded > 0) {
                toast.success(t("checks.norms.done", { count: upgraded }));
              }
            }),
        };
      case "client":
        return {
          label: t("checks.client.fix"),
          onClick: () => open({ kind: "details" }),
        };
      case "vat":
        return {
          label: t("checks.vat.fix"),
          onClick: () => open({ kind: "markups" }),
        };
      default:
        return null;
    }
  })();

  if (!fix) {
    return null;
  }
  if ("href" in fix) {
    return (
      <Button asChild variant="link" className="mt-2 justify-self-start">
        <Link href={fix.href}>{fix.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="link"
      className="mt-2 justify-self-start"
      disabled={busy}
      onClick={fix.onClick}
    >
      {fix.label}
    </Button>
  );
}
