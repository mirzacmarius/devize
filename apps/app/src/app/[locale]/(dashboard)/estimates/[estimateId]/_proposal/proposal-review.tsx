"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { AISuggestion } from "@devize/ui/ai-suggestion";
import { Badge } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Field } from "@/components/field";
import { InlineNumber } from "@/components/inline-number";
import { useNormSource } from "@/components/norm-source";
import { useRun } from "@/components/use-run";
import {
  formatConsumption,
  formatPercent,
  formatQuantity,
  formatUnit,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Proposal, ProposalItem, ProposalNorm } from "./types";

// Radix Select keeps "" for "nothing chosen", so the AI's recipe needs a value.
const OWN_RECIPE = "own";

/** The items in the order the AI wrote them, by chapter. */
function byChapter(items: readonly ProposalItem[]) {
  const chapters = new Map<string, ProposalItem[]>();
  for (const item of items) {
    const list = chapters.get(item.chapter) ?? [];
    list.push(item);
    chapters.set(item.chapter, list);
  }
  return [...chapters].map(([name, list]) => ({ name, items: list }));
}

/**
 * What the AI proposes, for a person to check: what it understood and
 * assumed, then each article with its quantity, norm and Antemăsurătoare.
 * Only the items kept go into the Deviz, and only with the last click.
 */
export function ProposalReview({
  proposal,
  onApplied,
  onNew,
}: {
  proposal: Proposal;
  onApplied: () => void;
  onNew: () => void;
}) {
  const t = useScopedI18n("proposal");
  const apply = useMutation(api.proposals.proposals.apply);
  const dismiss = useMutation(api.proposals.proposals.dismiss);
  const setAllSelected = useMutation(api.proposals.proposals.setAllSelected);
  const run = useRun();
  const [applying, setApplying] = useState(false);
  const selected = proposal.items.filter((item) => item.selected).length;

  const applySelected = async () => {
    setApplying(true);
    const result = await run(
      () => apply({ proposalId: proposal._id }),
      t("review.applied", { count: selected }),
    );
    setApplying(false);
    if (result.ok) {
      onApplied();
    }
  };

  return (
    <div className="grid gap-5">
      {proposal.summary && (
        <AISuggestion title={t("review.understood")}>
          {proposal.summary}
        </AISuggestion>
      )}
      {(proposal.assumptions.length > 0 || proposal.questions.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Notes title={t("review.assumptions")} notes={proposal.assumptions} />
          <Notes title={t("review.questions")} notes={proposal.questions} />
        </div>
      )}
      {proposal.matchError && (
        <p className="m-0 text-meta text-warning">{t("review.matchFailed")}</p>
      )}

      {proposal.items.length === 0 ? (
        <p className="m-0 text-body text-ink-2">{t("review.noItems")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-meta text-ink-2">
              {t("review.selectedCount", {
                selected,
                total: proposal.items.length,
              })}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  run(() =>
                    setAllSelected({
                      proposalId: proposal._id,
                      selected: true,
                    }),
                  )
                }
              >
                {t("review.all")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  run(() =>
                    setAllSelected({
                      proposalId: proposal._id,
                      selected: false,
                    }),
                  )
                }
              >
                {t("review.none")}
              </Button>
            </div>
          </div>
          {byChapter(proposal.items).map((chapter) => (
            <section key={chapter.name} className="grid gap-2">
              <h3 className="m-0 text-label uppercase text-ink-3">
                {chapter.name}
              </h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {chapter.items.map((item) => (
                  <ReviewItem key={item._id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <div className="sticky -bottom-6 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-panel px-6 py-3">
        <Button
          variant="ghost"
          onClick={() =>
            run(
              () => dismiss({ proposalId: proposal._id }),
              t("review.dismissed"),
            )
          }
        >
          {t("review.dismiss")}
        </Button>
        <Button variant="outline" onClick={onNew}>
          {t("review.again")}
        </Button>
        {proposal.items.length > 0 && (
          <Button
            variant="ai"
            disabled={selected === 0 || applying}
            onClick={applySelected}
          >
            {applying ? (
              <Icons.Loader className="animate-spin" aria-hidden />
            ) : (
              <Icons.AI aria-hidden />
            )}
            {t("review.apply", { count: selected })}
          </Button>
        )}
      </div>
    </div>
  );
}

function Notes({ title, notes }: { title: string; notes: string[] }) {
  if (notes.length === 0) {
    return null;
  }
  return (
    <div className="grid content-start gap-1.5">
      <p className="m-0 text-label uppercase text-ink-3">{title}</p>
      <ul className="m-0 grid list-disc gap-1 pl-5 text-body text-ink-2">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

function ReviewItem({ item }: { item: ProposalItem }) {
  const t = useScopedI18n("proposal");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const update = useMutation(api.proposals.proposals.updateItem);
  const run = useRun();
  const [open, setOpen] = useState(false);
  const title = item.norm?.title ?? item.title;
  const unit = formatUnit(item.norm?.unit ?? item.unit, locale);
  const detailsId = `proposal-item-${item._id}`;

  return (
    <li
      className={cn(
        "grid gap-2 rounded-md border border-border bg-card px-3 py-3",
        !item.selected && "bg-sunken",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={(event) =>
            run(() =>
              update({ itemId: item._id, selected: event.target.checked }),
            )
          }
          aria-label={t("review.keep", { title })}
          className="mt-1 size-4 accent-ai"
        />
        <div
          className={cn("grid min-w-0 gap-1", !item.selected && "opacity-60")}
        >
          <span className="text-body text-ink">{title}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3">
            {item.norm ? (
              <>
                <span className="font-mono text-code">{item.norm.code}</span>
                <span>{normSource(item.norm)}</span>
              </>
            ) : (
              <span>{t("review.ownRecipe")}</span>
            )}
            {item.confidence === "medium" && (
              <Badge>{t("review.assumed")}</Badge>
            )}
            {item.confidence === "low" && (
              <Badge tone="warning">{t("review.estimated")}</Badge>
            )}
          </span>
        </div>
        <div className="col-start-2 flex items-baseline gap-1 whitespace-nowrap sm:col-start-3">
          <InlineNumber
            value={item.quantity}
            format={(value) => formatQuantity(value, locale)}
            label={t("review.quantityOf", { title })}
            min={0.001}
            className="-my-1.5 w-24"
            onCommit={(quantity) =>
              run(() => update({ itemId: item._id, quantity }))
            }
          />
          <span className="text-meta text-ink-3">{unit}</span>
        </div>
      </div>
      <div className="grid gap-2 pl-7">
        {item.unitMismatch && (
          <p className="m-0 text-meta text-warning">
            {t("review.unitMismatch")}
          </p>
        )}
        {item.note && <p className="m-0 text-meta text-ink-2">{item.note}</p>}
        <Button
          variant="link"
          size="sm"
          className="justify-self-start text-meta text-ink-2"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? t("review.hideDetails") : t("review.details")}
        </Button>
        {open && (
          <div id={detailsId} className="grid gap-3">
            <NormChoice item={item} />
            {item.takeoff.length > 0 && <Takeoff item={item} />}
            {!item.norm && item.resources.length > 0 && <Recipe item={item} />}
          </div>
        )}
      </div>
    </li>
  );
}

function NormChoice({ item }: { item: ProposalItem }) {
  const t = useScopedI18n("proposal");
  const locale = useCurrentLocale();
  const update = useMutation(api.proposals.proposals.updateItem);
  const run = useRun();
  const options: ProposalNorm[] = [...item.candidates];
  if (item.norm && !options.some((norm) => norm._id === item.norm?._id)) {
    options.unshift(item.norm);
  }
  if (options.length === 0) {
    return <p className="m-0 text-meta text-ink-3">{t("review.noNorm")}</p>;
  }
  const selectId = `proposal-norm-${item._id}`;
  return (
    <Field label={t("review.norm")} htmlFor={selectId} hint={item.matchNote}>
      <Select
        value={item.norm?._id ?? OWN_RECIPE}
        onValueChange={(next) =>
          run(() =>
            update({
              itemId: item._id,
              normId: next === OWN_RECIPE ? null : (next as Id<"norms">),
            }),
          )
        }
      >
        <SelectTrigger id={selectId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={OWN_RECIPE}>{t("review.ownRecipe")}</SelectItem>
          <SelectSeparator />
          {options.map((norm) => (
            <SelectItem key={norm._id} value={norm._id}>
              {`${norm.code} · ${norm.title} (${formatUnit(norm.unit, locale)})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** count × length × width × height, as an Antemăsurătoare writes a row. */
function rowAmount(row: ProposalItem["takeoff"][number]) {
  return row.count * (row.length ?? 1) * (row.width ?? 1) * (row.height ?? 1);
}

function Takeoff({ item }: { item: ProposalItem }) {
  const t = useScopedI18n("proposal");
  const locale = useCurrentLocale();
  const number = (value: number) => formatQuantity(value, locale);
  const rows = item.takeoff.map((row, position) => ({ ...row, position }));
  return (
    <div className="grid gap-1.5 rounded-md border border-border bg-sunken px-3 py-2.5">
      <p className="m-0 text-label uppercase text-ink-3">
        {t("review.takeoff")}
      </p>
      <ul className="m-0 grid list-none gap-1 p-0 text-meta">
        {rows.map((row) => (
          <li
            key={row.position}
            className="flex min-w-0 items-baseline justify-between gap-3"
          >
            <span className="min-w-0 text-ink-2">{row.label}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                row.deduct ? "text-danger" : "text-ink",
              )}
            >
              {row.deduct ? "− " : ""}
              {[row.count, row.length, row.width, row.height]
                .flatMap((value) =>
                  value === undefined ? [] : [number(value)],
                )
                .join(" × ")}
              {" = "}
              {number(rowAmount(row))}
            </span>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 border-t border-border pt-1 font-medium">
          <span className="text-ink-2">{t("review.total")}</span>
          <span className="tabular-nums text-ink">
            {number(item.measured)} {formatUnit(item.unit, locale)}
          </span>
        </li>
      </ul>
    </div>
  );
}

function Recipe({ item }: { item: ProposalItem }) {
  const t = useScopedI18n("proposal");
  const tKinds = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const resources = item.resources.map((resource, position) => ({
    ...resource,
    position,
  }));
  return (
    <div className="grid gap-1.5">
      <p className="m-0 text-label uppercase text-ink-3">
        {t("review.recipe", { unit: formatUnit(item.unit, locale) })}
      </p>
      <ul className="m-0 grid list-none gap-1 p-0">
        {resources.map((resource) => (
          <li
            key={resource.position}
            className="flex min-w-0 items-baseline justify-between gap-3 text-meta"
          >
            <span className="min-w-0">
              <span className="text-ink">{resource.name}</span>
              <span className="text-ink-3">
                {" · "}
                {tKinds(`kinds.${resource.kind}`)}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-ink-2">
              {resource.unit === "%"
                ? formatPercent(resource.quantity, locale)
                : `${formatConsumption(resource.quantity, locale)} ${formatUnit(resource.unit, locale)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
