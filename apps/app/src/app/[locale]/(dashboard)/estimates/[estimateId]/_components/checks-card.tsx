"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardFrame,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { formatAmount, formatMoney, formatPercent } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { useStartOmissions } from "../_proposal/omissions-sheet";
import { laborFloor } from "@devize/backend/convex/lib/labor";
import type { Check as CheckResult, CheckState } from "./checks";
import { useRefreshedMessage } from "./estimate-actions";
import type { Estimate, OpenPanel, Updates } from "./types";

const ringClass: Record<CheckState, string> = {
  passed: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  failed: "bg-danger-soft text-danger",
  pending: "shadow-[inset_0_0_0_1.5px_hsl(var(--tick))]",
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
}: {
  estimate: Estimate;
  checks: CheckResult[];
  updates: Updates | undefined;
  editable: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const passed = checks.filter((check) => check.state === "passed").length;
  return (
    <CardFrame>
      <Card>
        <CardHeader>
          <CardTitle>{t("checks.title")}</CardTitle>
          <span className="text-meta text-ink-3">
            {t("checks.score", { passed, total: checks.length })}
          </span>
        </CardHeader>
        <CardContent>
          <ul className="m-0 grid list-none gap-3 p-0">
            {checks.map((check) => (
              <CheckRow
                key={check.id}
                estimate={estimate}
                check={check}
                updates={updates}
                editable={editable}
                open={open}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </CardFrame>
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
  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full",
          ringClass[check.state],
        )}
      >
        {check.state === "passed" && <Check className="size-3.5" aria-hidden />}
        {check.state === "warning" && (
          <CircleAlert className="size-3.5" aria-hidden />
        )}
        {check.state === "failed" && (
          <TriangleAlert className="size-3.5" aria-hidden />
        )}
      </span>
      <div className="grid min-w-0 justify-items-start">
        <span className="text-body font-medium text-ink">
          <span className="sr-only">{t(`checks.states.${check.state}`)}: </span>
          {title}
        </span>
        <span
          className={cn(
            "text-meta",
            check.state === "warning" ? "text-warning" : "text-ink-3",
          )}
        >
          {detail}
        </span>
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
  return (check: CheckResult): { title: string; detail: string } => {
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
            difference:
              check.difference > 0
                ? `+${amount}`
                : check.difference < 0
                  ? `−${amount}`
                  : amount,
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
      className="mt-1 text-meta"
      disabled={starting}
      onClick={async () => {
        if (check.status !== "none" || (await start())) {
          open({ kind: "omissions" });
        }
      }}
    >
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
      <Button asChild variant="link" className="mt-1 text-meta">
        <Link href={fix.href}>{fix.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="link"
      className="mt-1 text-meta"
      disabled={busy}
      onClick={fix.onClick}
    >
      {fix.label}
    </Button>
  );
}
