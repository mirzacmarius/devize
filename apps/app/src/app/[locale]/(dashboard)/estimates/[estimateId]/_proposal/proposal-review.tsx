"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { normalizeUnit } from "@devize/backend/convex/lib/text";
import { MAX_TENDER_ITEMS } from "@devize/backend/convex/proposals/lib/input";
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
import { useMutation, useQuery } from "convex/react";
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
import type {
  ItemDetails,
  Proposal,
  ProposalItem,
  ProposalNorm,
  TenderIssue,
} from "./types";

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

type TenderSection = NonNullable<ProposalItem["tender"]>["object"];

const sectionKey = (section: TenderSection) =>
  section ? `${section.code ?? ""}|${section.name}` : "";

const sectionLabel = (section: NonNullable<TenderSection>) =>
  section.code ? `${section.code} · ${section.name}` : section.name;

/** A tender's positions in the lists' order, by Obiect, then Capitol. */
function byObjectAndChapter(items: readonly ProposalItem[]) {
  const objects: {
    key: string;
    object: TenderSection;
    chapters: { key: string; chapter: TenderSection; items: ProposalItem[] }[];
  }[] = [];
  for (const item of items) {
    const objectKey = sectionKey(item.tender?.object);
    let object = objects.find((found) => found.key === objectKey);
    if (!object) {
      object = { key: objectKey, object: item.tender?.object, chapters: [] };
      objects.push(object);
    }
    const chapterKey = sectionKey(item.tender?.chapter);
    let chapter = object.chapters.find((found) => found.key === chapterKey);
    if (!chapter) {
      chapter = { key: chapterKey, chapter: item.tender?.chapter, items: [] };
      object.chapters.push(chapter);
    }
    chapter.items.push(item);
  }
  return objects;
}

/**
 * What the AI proposes, for a person to check: what it understood and
 * assumed, or what it couldn't read in a tender's lists, then each article
 * with its quantity and norm. Only the items kept go into the Deviz, and
 * only with the last click.
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
  const tender = proposal.source === "tender";
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
      {tender && <Issues issues={proposal.progress?.issues ?? []} />}
      {proposal.matchError && (
        <p className="m-0 text-meta text-warning">
          {tender ? t("tender.matchFailed") : t("review.matchFailed")}
        </p>
      )}

      {proposal.items.length === 0 ? (
        <p className="m-0 text-body text-ink-2">
          {tender ? t("tender.noItems") : t("review.noItems")}
        </p>
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
          {tender
            ? byObjectAndChapter(proposal.items).map((object) => (
                <section key={object.key} className="grid gap-3">
                  {object.object && (
                    <h3 className="m-0 text-body font-medium text-ink">
                      {sectionLabel(object.object)}
                    </h3>
                  )}
                  {object.chapters.map((chapter) => (
                    <div key={chapter.key} className="grid gap-2">
                      {chapter.chapter && (
                        <h4 className="m-0 text-label uppercase text-ink-3">
                          {sectionLabel(chapter.chapter)}
                        </h4>
                      )}
                      <ul className="m-0 grid list-none gap-2 p-0">
                        {chapter.items.map((item) => (
                          <ReviewItem key={item._id} item={item} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))
            : byChapter(proposal.items).map((chapter) => (
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
          {tender ? t("tender.again") : t("review.again")}
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

/** What the import couldn't take from the lists, so the person adds it. */
function Issues({ issues }: { issues: readonly TenderIssue[] }) {
  const t = useScopedI18n("proposal");
  if (issues.length === 0) {
    return null;
  }
  const text = (issue: TenderIssue) => {
    switch (issue.kind) {
      case "unreadable":
        return issue.file
          ? t("tender.issues.unreadable", { file: issue.file })
          : t("tender.issues.deleted");
      case "no_quantity":
        return t("tender.issues.noQuantity", {
          file: issue.file,
          positions: (issue.positions ?? []).join(", "),
        });
      case "too_many":
        return t("tender.issues.tooMany", {
          file: issue.file,
          max: MAX_TENDER_ITEMS,
        });
    }
  };
  return (
    <div className="grid gap-1.5 rounded-md bg-warning-soft px-4 py-3">
      <p className="m-0 flex items-center gap-2 text-body font-medium text-warning">
        <Icons.Problem className="size-4 shrink-0" aria-hidden />
        {t("tender.issues.title")}
      </p>
      <ul className="m-0 grid list-disc gap-1 pl-5 text-body text-ink-2">
        {issues.map((issue) => (
          <li key={`${issue.kind}:${issue.file}`}>{text(issue)}</li>
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
  const tender = item.tender;
  // A tender's position keeps the list's own words; an article takes its
  // norm's.
  const title = tender ? item.title : (item.norm?.title ?? item.title);
  // What screen readers call it: a long position by its number and start.
  const name = tender
    ? `${t("tender.position", { position: tender.position })} ${title.slice(0, 80)}`
    : title;
  const detailsId = `proposal-item-${item._id}`;
  const quantity = (
    value: number,
    label: string,
    onCommit: (value: number) => void,
  ) => (
    <InlineNumber
      value={value}
      format={(number) => formatQuantity(number, locale)}
      label={label}
      min={0.001}
      className="-my-1.5 w-24"
      onCommit={onCommit}
    />
  );
  const normUnit = item.norm && formatUnit(item.norm.unit, locale);
  const listUnit = formatUnit(item.unit, locale);
  // In the Deviz, a tender's position counts in its norm's unit, which the
  // list may write another way ("m2" for "mp").
  const converted =
    tender !== undefined &&
    item.norm !== null &&
    normalizeUnit(item.norm.unit) !== normalizeUnit(item.unit);

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
          aria-label={t("review.keep", { title: name })}
          className="mt-1 size-4 accent-ai"
        />
        <div
          className={cn("grid min-w-0 gap-1", !item.selected && "opacity-60")}
        >
          {tender && (
            <span className="text-meta text-ink-3">
              {t("tender.position", { position: tender.position })}
              {tender.code && (
                <>
                  {" · "}
                  <span className="font-mono text-code">{tender.code}</span>
                </>
              )}
            </span>
          )}
          <span className={cn("text-body text-ink", tender && "line-clamp-3")}>
            {title}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3">
            {item.norm ? (
              <>
                <span className="font-mono text-code">{item.norm.code}</span>
                {tender && (
                  <span className="min-w-0 text-ink-2">{item.norm.title}</span>
                )}
                <span>{normSource(item.norm)}</span>
              </>
            ) : item.recipe || !tender ? (
              <span>{t("review.ownRecipe")}</span>
            ) : (
              <span className="text-warning">{t("tender.noRecipe")}</span>
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
          {tender
            ? quantity(
                item.measured,
                t("tender.listQuantityOf", { title: name }),
                (measured) => run(() => update({ itemId: item._id, measured })),
              )
            : quantity(
                item.quantity,
                t("review.quantityOf", { title: name }),
                (value) =>
                  run(() => update({ itemId: item._id, quantity: value })),
              )}
          <span className="text-meta text-ink-3">
            {tender ? listUnit : (normUnit ?? listUnit)}
          </span>
        </div>
      </div>
      <div className="grid gap-2 pl-7">
        {converted && (
          <div className="flex flex-wrap items-baseline gap-1 text-meta text-ink-2">
            <span>{t("tender.inEstimate")}</span>
            {quantity(
              item.quantity,
              t("tender.estimateQuantityOf", { title: name }),
              (value) =>
                run(() => update({ itemId: item._id, quantity: value })),
            )}
            <span className="text-ink-3">{normUnit}</span>
          </div>
        )}
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
        {open && <Details id={detailsId} item={item} />}
      </div>
    </li>
  );
}

/** An item's norms, measuring and recipe, read when it is opened. */
function Details({ id, item }: { id: string; item: ProposalItem }) {
  const t = useScopedI18n("proposal");
  const tc = useScopedI18n("common");
  const details = useQuery(api.proposals.proposals.itemDetails, {
    itemId: item._id,
  });
  if (details === undefined) {
    return (
      <p id={id} className="m-0 text-meta text-ink-3">
        {tc("loading")}
      </p>
    );
  }
  return (
    <div id={id} className="grid gap-3">
      {/* A long position's text, cut in the list. */}
      {item.tender && details.text.length > item.title.length && (
        <div className="grid gap-1">
          <p className="m-0 text-label uppercase text-ink-3">
            {t("tender.fullText")}
          </p>
          <p className="m-0 whitespace-pre-line text-meta text-ink-2">
            {details.text}
          </p>
        </div>
      )}
      <NormChoice item={item} details={details} />
      {details.takeoff.length > 0 && (
        <Takeoff item={item} rows={details.takeoff} />
      )}
      {!item.norm && details.resources.length > 0 && (
        <Recipe item={item} resources={details.resources} />
      )}
    </div>
  );
}

function NormChoice({
  item,
  details,
}: {
  item: ProposalItem;
  details: ItemDetails;
}) {
  const t = useScopedI18n("proposal");
  const locale = useCurrentLocale();
  const update = useMutation(api.proposals.proposals.updateItem);
  const run = useRun();
  const options: ProposalNorm[] = [...details.candidates];
  if (item.norm && !options.some((norm) => norm._id === item.norm?._id)) {
    options.unshift(item.norm);
  }
  if (options.length === 0) {
    return <p className="m-0 text-meta text-ink-3">{t("review.noNorm")}</p>;
  }
  const selectId = `proposal-norm-${item._id}`;
  return (
    <Field label={t("review.norm")} htmlFor={selectId} hint={details.matchNote}>
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

type TakeoffRow = ItemDetails["takeoff"][number];

/** count × length × width × height, as an Antemăsurătoare writes a row. */
function rowAmount(row: TakeoffRow) {
  return row.count * (row.length ?? 1) * (row.width ?? 1) * (row.height ?? 1);
}

function Takeoff({
  item,
  rows,
}: {
  item: ProposalItem;
  rows: readonly TakeoffRow[];
}) {
  const t = useScopedI18n("proposal");
  const locale = useCurrentLocale();
  const number = (value: number) => formatQuantity(value, locale);
  const numbered = rows.map((row, position) => ({ ...row, position }));
  return (
    <div className="grid gap-1.5 rounded-md border border-border bg-sunken px-3 py-2.5">
      <p className="m-0 text-label uppercase text-ink-3">
        {t("review.takeoff")}
      </p>
      <ul className="m-0 grid list-none gap-1 p-0 text-meta">
        {numbered.map((row) => (
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

function Recipe({
  item,
  resources,
}: {
  item: ProposalItem;
  resources: ItemDetails["resources"];
}) {
  const t = useScopedI18n("proposal");
  const tKinds = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const numbered = resources.map((resource, position) => ({
    ...resource,
    position,
  }));
  return (
    <div className="grid gap-1.5">
      <p className="m-0 text-label uppercase text-ink-3">
        {t("review.recipe", { unit: formatUnit(item.unit, locale) })}
      </p>
      <ul className="m-0 grid list-none gap-1 p-0">
        {numbered.map((resource) => (
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
