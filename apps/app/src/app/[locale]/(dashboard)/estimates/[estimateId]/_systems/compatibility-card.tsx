"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { Check, CircleAlert, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { RestDialog } from "./rest-dialog";
import type { Finding, RestSuggestion } from "./types";

// How many of the Articole that started a system to name.
const NAMED = 2;

/**
 * Sisteme compatibile on a Deviz's page: the materials that don't suit
 * where an Articol is done, each with why and the swap or norm that fixes
 * it, and what the systems the Deviz started still lack. What the firm hides
 * stays hidden in the Deviz's revisions.
 */
export function CompatibilityCard({
  estimate,
  editable,
}: {
  estimate: Estimate;
  editable: boolean;
}) {
  const t = useScopedI18n("compatibility");
  const check = useQuery(api.systems.check.forEstimate, {
    estimateId: estimate._id,
  });
  const [showDismissed, setShowDismissed] = useState(false);
  const [adding, setAdding] = useState<RestSuggestion | null>(null);

  const findings = check?.findings ?? [];
  const rest = check?.rest ?? [];
  const open = findings.filter((finding) => !finding.dismissed);
  const openRest = rest.filter((suggestion) => !suggestion.dismissed);
  const hidden =
    findings.length - open.length + (rest.length - openRest.length);
  const errors = open.filter((finding) => finding.severity === "error").length;
  const warnings = open.length - errors;
  const shownFindings = showDismissed ? findings : open;
  const shownRest = showDismissed ? rest : openRest;

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <CardTitle>{t("title")}</CardTitle>
        {check && (errors > 0 || warnings > 0) && (
          <span className="text-meta text-ink-3">
            {[
              errors > 0 ? t("errors", { count: errors }) : "",
              warnings > 0 ? t("warnings", { count: warnings }) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-3">
        {check === undefined ? (
          <p className="m-0 text-meta text-ink-3">{t("loading")}</p>
        ) : estimate.lineItems.length === 0 ? (
          <p className="m-0 text-meta text-ink-3">{t("empty")}</p>
        ) : (
          open.length === 0 &&
          openRest.length === 0 && (
            <p className="m-0 flex items-center gap-2 text-body text-ink-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                <Check className="size-3.5" aria-hidden />
              </span>
              {t("clear")}
            </p>
          )
        )}
        {shownFindings.length > 0 && (
          <ul className="m-0 grid list-none gap-4 p-0">
            {shownFindings.map((finding) => (
              <FindingRow
                key={finding.key}
                estimateId={estimate._id}
                finding={finding}
                editable={editable}
              />
            ))}
          </ul>
        )}
        {shownRest.length > 0 && (
          <div className="grid gap-3">
            <h4 className="m-0 text-label uppercase text-ink-3">
              {t("rest.title")}
            </h4>
            <ul className="m-0 grid list-none gap-4 p-0">
              {shownRest.map((suggestion) => (
                <RestRow
                  key={suggestion.key}
                  estimateId={estimate._id}
                  suggestion={suggestion}
                  editable={editable}
                  onAdd={() => setAdding(suggestion)}
                />
              ))}
            </ul>
          </div>
        )}
        {!editable && open.length + openRest.length > 0 && (
          <p className="m-0 text-meta text-ink-3">{t("locked")}</p>
        )}
        {hidden > 0 && (
          <Button
            type="button"
            variant="link"
            className="justify-self-start text-meta"
            onClick={() => setShowDismissed((current) => !current)}
          >
            {showDismissed
              ? t("hideDismissed")
              : t("showDismissed", { count: hidden })}
          </Button>
        )}
      </CardContent>
      <RestDialog
        estimateId={estimate._id}
        suggestion={adding}
        onClose={() => setAdding(null)}
      />
    </Card>
  );
}

/** Hides a finding or a suggestion for the Deviz, or shows it again. */
function useDismiss(estimateId: Id<"estimates">) {
  const t = useScopedI18n("compatibility");
  const dismiss = useMutation(api.systems.fixes.dismiss);
  const restore = useMutation(api.systems.fixes.restore);
  const run = useRun();
  return async (key: string, dismissed: boolean) =>
    dismissed
      ? await run(() => restore({ estimateId, key }), t("restored"))
      : await run(() => dismiss({ estimateId, key }), t("dismissed"));
}

function FindingRow({
  estimateId,
  finding,
  editable,
}: {
  estimateId: Id<"estimates">;
  finding: Finding;
  editable: boolean;
}) {
  const t = useScopedI18n("compatibility");
  const swapMaterial = useMutation(api.systems.fixes.swapMaterial);
  const switchNorm = useMutation(api.systems.fixes.useNorm);
  const toggle = useDismiss(estimateId);
  const run = useRun();
  const [busy, setBusy] = useState(false);
  const context = finding.context ? t(`contexts.${finding.context}`) : "";
  const { title, why } =
    finding.ruleId === "system_unsuitable"
      ? {
          title: t("rules.system_unsuitable.title", { context }),
          why: t("rules.system_unsuitable.why", {
            context,
            system: finding.material,
          }),
        }
      : {
          title: t(`rules.${finding.ruleId}.title`),
          why: t(`rules.${finding.ruleId}.why`),
        };
  const where = (() => {
    switch (finding.reason?.from) {
      case "section":
        return t("where.section", { name: finding.reason.name });
      case "estimate":
        return t("where.estimate", { title: finding.reason.title });
      case "sibling":
        return t("where.sibling", { title: finding.reason.title });
      default:
        return null;
    }
  })();

  const act = async (work: () => Promise<unknown>) => {
    setBusy(true);
    await work();
    setBusy(false);
  };

  const fix = finding.fix;
  return (
    <li
      className={cn(
        "grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3",
        finding.dismissed && "opacity-60",
      )}
    >
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full",
          finding.severity === "error"
            ? "bg-danger-soft text-danger"
            : "bg-warning-soft text-warning",
        )}
      >
        {finding.severity === "error" ? (
          <TriangleAlert className="size-3.5" aria-hidden />
        ) : (
          <CircleAlert className="size-3.5" aria-hidden />
        )}
      </span>
      <div className="grid min-w-0 justify-items-start gap-0.5">
        <span className="text-body font-medium text-ink">
          <span className="sr-only">{t(`severity.${finding.severity}`)}: </span>
          {title}
        </span>
        <span className="text-meta text-ink-3">
          {t("item", { title: finding.itemTitle, material: finding.material })}
        </span>
        <span className="text-meta text-ink-2">{why}</span>
        {where && <span className="text-meta text-warning">{where}</span>}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {editable && !finding.dismissed && fix?.kind === "material" && (
            <Button
              type="button"
              variant="link"
              className="text-meta"
              disabled={busy}
              onClick={() =>
                act(() =>
                  run(
                    () =>
                      swapMaterial({
                        lineItemId: finding.lineItemId,
                        resourceKey: finding.resourceKey,
                        ruleId: finding.ruleId,
                      }),
                    t("swapped"),
                  ),
                )
              }
            >
              {t("swap", { name: fix.material.name })}
            </Button>
          )}
          {editable && !finding.dismissed && fix?.kind === "norm" && (
            <Button
              type="button"
              variant="link"
              className="text-meta"
              title={fix.norm.title}
              disabled={busy}
              onClick={() =>
                act(() =>
                  run(
                    () =>
                      switchNorm({
                        lineItemId: finding.lineItemId,
                        normId: fix.norm.normId,
                      }),
                    t("switched", { code: fix.norm.code }),
                  ),
                )
              }
            >
              {t("useNorm", { code: fix.norm.code })}
            </Button>
          )}
          <Button
            type="button"
            variant="link"
            className="text-meta text-ink-3"
            disabled={busy}
            onClick={() => act(() => toggle(finding.key, finding.dismissed))}
          >
            {finding.dismissed ? t("restore") : t("dismiss")}
          </Button>
        </div>
        {editable && !finding.dismissed && finding.alternatives.length > 0 && (
          <div className="mt-2 grid w-full gap-1 rounded-md bg-sunken px-3 py-2">
            <span className="text-label uppercase text-ink-3">
              {t("alternatives")}
            </span>
            <ul className="m-0 grid list-none gap-1 p-0">
              {finding.alternatives.map((alternative) => (
                <li
                  key={alternative.systemId}
                  className="flex flex-wrap items-baseline gap-x-2"
                >
                  <span className="text-meta text-ink-2">
                    {t("alternative", {
                      system: alternative.system,
                      producer: alternative.producer,
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    className="text-meta"
                    title={alternative.norm.title}
                    disabled={busy}
                    onClick={() =>
                      act(() =>
                        run(
                          () =>
                            switchNorm({
                              lineItemId: finding.lineItemId,
                              normId: alternative.norm.normId,
                            }),
                          t("switched", { code: alternative.norm.code }),
                        ),
                      )
                    }
                  >
                    {t("useNorm", { code: alternative.norm.code })}
                  </Button>
                </li>
              ))}
            </ul>
            <span className="text-meta text-ink-3">{t("neutral")}</span>
          </div>
        )}
      </div>
    </li>
  );
}

function RestRow({
  estimateId,
  suggestion,
  editable,
  onAdd,
}: {
  estimateId: Id<"estimates">;
  suggestion: RestSuggestion;
  editable: boolean;
  onAdd: () => void;
}) {
  const t = useScopedI18n("compatibility.rest");
  const tc = useScopedI18n("compatibility");
  const locale = useCurrentLocale();
  const toggle = useDismiss(estimateId);
  const [busy, setBusy] = useState(false);
  const { system, norm, quantity } = suggestion;
  const unit = formatUnit(norm.unit, locale);
  const items = suggestion.itemTitles.slice(0, NAMED).join("”, „");

  return (
    <li
      className={cn(
        "grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3",
        suggestion.dismissed && "opacity-60",
      )}
    >
      <span className="grid size-6 place-items-center rounded-full bg-muted text-ink-2">
        <Plus className="size-3.5" aria-hidden />
      </span>
      <div className="grid min-w-0 justify-items-start gap-0.5">
        <span className="text-body font-medium text-ink">
          {t("missing", { title: norm.title })}
        </span>
        <span className="text-meta text-ink-3">
          {t("from", {
            system:
              system.kind === "producer"
                ? `${system.name} · ${system.producer}`
                : system.name,
            items,
          })}
        </span>
        {quantity && (
          <span className="text-meta text-ink-2">
            {quantity.from === "same"
              ? t("quantitySame", {
                  quantity: formatQuantity(quantity.quantity, locale),
                  unit,
                })
              : t("quantityPerimeter", {
                  quantity: formatQuantity(quantity.quantity, locale),
                  unit,
                })}
          </span>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {editable && !suggestion.dismissed && (
            <Button
              type="button"
              variant="link"
              className="text-meta"
              onClick={onAdd}
            >
              {t("add")}
            </Button>
          )}
          <Button
            type="button"
            variant="link"
            className="text-meta text-ink-3"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await toggle(suggestion.key, suggestion.dismissed);
              setBusy(false);
            }}
          >
            {suggestion.dismissed ? tc("restore") : tc("dismiss")}
          </Button>
        </div>
      </div>
    </li>
  );
}
