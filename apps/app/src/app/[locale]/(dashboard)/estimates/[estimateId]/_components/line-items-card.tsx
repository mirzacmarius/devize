"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Count } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@devize/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableGroupRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { ChevronDown, ChevronRight, Lock, Plus } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { InlineNumber } from "@/components/inline-number";
import { useNormSource } from "@/components/norm-source";
import { useRun } from "@/components/use-run";
import { formatMoney, formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { groupLines, type NumberedItem, type SectionGroup } from "./groups";
import { ResourceTable } from "./resource-table";
import { orderedSections } from "./section-select";
import type { Estimate, LineItem, OpenPanel, Section, Updates } from "./types";

type Group = SectionGroup<Section, LineItem>;

// The card is a size container, so the columns follow its width, not the
// screen's: beside the checks at 1280 px it's narrower than alone at 1024 px.
// A narrow card drops the number and quantity columns, a mid-size one the
// unit price, and the item's own lines then show what they held.
const FROM_MID = "hidden [@container(min-width:38rem)]:table-cell";
const FROM_WIDE = "hidden [@container(min-width:44rem)]:table-cell";
const NARROW_ONLY = "[@container(min-width:38rem)]:hidden";
const MID_UP = "hidden [@container(min-width:38rem)]:block";
const MID_ONLY =
  "hidden [@container(min-width:38rem)]:inline [@container(min-width:44rem)]:hidden";
// With no number column, the item column starts at the card's edge.
const ITEM_CELL = "pl-0 [@container(min-width:38rem)]:pl-1";
const NESTED_ITEM_CELL = "pl-3 [@container(min-width:38rem)]:pl-4";
// Past the chevron, so heads and section names start where the titles do.
const TITLE_CELL = "pl-0 [@container(min-width:38rem)]:pl-7";
const NESTED_TITLE_CELL = "pl-3 [@container(min-width:38rem)]:pl-10";

const tagDot = {
  danger: "bg-danger-solid",
  warning: "bg-warning-dot",
  ai: "bg-ai",
};

/**
 * A property of a row, on its quietest line: a dot and a word. With many rows
 * in a Deviz, a filled tag on each would outweigh the numbers.
 */
function RowTag({
  tone,
  children,
}: {
  tone: keyof typeof tagDot;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-2">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", tagDot[tone])}
      />
      {children}
    </span>
  );
}

/** Lei for one unit of a line item, all kinds of resources together. */
function unitPrice(item: LineItem) {
  const { material, labor, equipment, transport } = item.unitCost;
  return Math.round((material + labor + equipment + transport) * 100) / 100;
}

/**
 * The Articole de deviz, by Obiect and Capitol, with their quantities and
 * values. A row opens to show its resources.
 */
export function LineItemsCard({
  estimate,
  updates,
  editable,
  open,
}: {
  estimate: Estimate;
  updates: Updates | undefined;
  editable: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const tProposal = useScopedI18n("proposal");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const groups = groupLines(estimate.sections, estimate.lineItems);
  const count = estimate.lineItems.length;
  const isEmpty = count === 0 && estimate.sections.length === 0;
  const newNorms = new Set(updates?.normUpdates.map((u) => u.lineItemId));
  const newPrices = new Set(updates?.priceChanges.map((c) => c.lineItemId));
  // The last item of each section, so an item moved there goes to its end.
  const lastItems = new Map<string, Id<"lineItems">>();
  for (const item of estimate.lineItems) {
    lastItems.set(item.sectionId ?? "", item._id);
  }

  const toggle = (itemId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

  const rows = (items: readonly NumberedItem<LineItem>[], nested: boolean) =>
    items.map(({ item, index }, position) => (
      <ItemRows
        key={item._id}
        item={item}
        index={index}
        nested={nested}
        siblings={items.map((row) => row.item)}
        position={position}
        sections={estimate.sections}
        lastItems={lastItems}
        editable={editable}
        expanded={expanded.has(item._id)}
        onToggle={() => toggle(item._id)}
        newNorm={newNorms.has(item._id)}
        newPrice={newPrices.has(item._id)}
        open={open}
      />
    ));

  const sectionRows = (group: Group, nested: boolean, siblings: Group[]) => (
    <Fragment key={group.section._id}>
      <SectionRow
        group={group}
        nested={nested}
        siblings={siblings.map((sibling) => sibling.section)}
        editable={editable}
        open={open}
      />
      {rows(group.items, nested)}
      {group.items.length === 0 && group.chapters.length === 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell className={FROM_MID} />
          <TableCell
            colSpan={4}
            className={cn(
              "text-meta text-ink-3",
              nested ? NESTED_ITEM_CELL : ITEM_CELL,
            )}
          >
            <p className="m-0 pl-6">{t("sections.empty")}</p>
          </TableCell>
        </TableRow>
      )}
      {group.chapters.map((chapter) =>
        sectionRows(chapter, true, group.chapters),
      )}
    </Fragment>
  );

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div className="flex items-center gap-2">
          <CardTitle>{t("items.title")}</CardTitle>
          <Count tone="plain">{count}</Count>
        </div>
        {editable && (
          <div className="flex flex-wrap items-center gap-2">
            {/* An empty Deviz offers these in its empty state. */}
            {!isEmpty && (
              <>
                <Button
                  variant="ai"
                  size="sm"
                  onClick={() => open({ kind: "proposal" })}
                >
                  <Icons.AI aria-hidden />
                  {tProposal("open")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => open({ kind: "addNorm" })}
                >
                  <Plus aria-hidden />
                  {t("items.addNorm")}
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {isEmpty ? (
                  <Button variant="outline" size="sm">
                    {t("items.addSection")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="-ml-[9px] w-8 rounded-l-none px-0"
                    aria-label={t("items.addMore")}
                  >
                    <ChevronDown aria-hidden />
                  </Button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isEmpty && (
                  <>
                    <DropdownMenuItem onSelect={() => open({ kind: "custom" })}>
                      {t("items.addCustom")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onSelect={() =>
                    open({ kind: "newSection", sectionKind: "chapter" })
                  }
                >
                  {t("sections.newChapter")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    open({ kind: "newSection", sectionKind: "object" })
                  }
                >
                  {t("sections.newObject")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {!editable && (
          <p className="m-0 flex items-center gap-1.5 text-meta text-ink-3 max-sm:hidden">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {t("items.locked")}
          </p>
        )}
      </CardHeader>
      <CardContent className="[container-type:inline-size]">
        {isEmpty ? (
          <EmptyState
            icon={<Icons.Articles />}
            title={t("items.emptyTitle")}
            description={
              editable ? t("items.emptyDescription") : t("items.emptyLocked")
            }
            action={
              editable && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="ai"
                    onClick={() => open({ kind: "proposal" })}
                  >
                    <Icons.AI aria-hidden />
                    {estimate.kind === "tender"
                      ? tProposal("emptyTenderAction")
                      : tProposal("emptyAction")}
                  </Button>
                  <Button onClick={() => open({ kind: "addNorm" })}>
                    <Plus aria-hidden />
                    {t("items.addNorm")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => open({ kind: "custom" })}
                  >
                    {t("items.addCustom")}
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <Table bleed className="items-table">
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-7", FROM_MID)}>#</TableHead>
                <TableHead className={TITLE_CELL}>
                  {t("items.columns.item")}
                </TableHead>
                {/* Over the numbers, not over the unit that follows them. */}
                <TableHead className={cn("pr-[52px] text-right", FROM_MID)}>
                  {t("items.columns.quantity")}
                </TableHead>
                <TableHead className={cn("text-right", FROM_WIDE)}>
                  {t("items.columns.unitPrice")}
                </TableHead>
                <TableHead className="text-right">
                  {t("items.columns.value")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows(groups.loose, false)}
              {groups.sections.map((group) =>
                sectionRows(group, false, groups.sections),
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SectionRow({
  group,
  nested,
  siblings,
  editable,
  open,
}: {
  group: Group;
  nested: boolean;
  siblings: Section[];
  editable: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const { section } = group;

  return (
    // The same cells as an item row, since which columns show depends on the
    // card's width and a span can't follow it.
    <TableGroupRow className="items-band group/band">
      <TableCell className={cn("band-start", FROM_MID)} />
      <TableCell
        className={cn(
          "band-start",
          nested ? NESTED_TITLE_CELL : TITLE_CELL,
          editable && "relative",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-baseline gap-x-2",
            editable && "pr-9",
          )}
        >
          {section.kind === "object" && (
            <span className="text-caption text-ink-3">
              {t("sections.object")}
            </span>
          )}
          {section.code && (
            <span className="text-meta tabular-nums text-ink-3">
              {section.code}
            </span>
          )}
          <span className="text-body font-medium text-ink">{section.name}</span>
        </div>
        {editable && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <SectionMenu group={group} siblings={siblings} open={open} />
          </div>
        )}
      </TableCell>
      <TableCell className={FROM_MID} />
      <TableCell className={FROM_WIDE} />
      <TableCell className="band-end whitespace-nowrap text-right font-medium tabular-nums">
        {formatMoney(group.total, locale)}
        {/* A phone has no column head to say it: on the totals, not every line. */}
        <span
          className={cn("ml-1 text-meta font-normal text-ink-3", NARROW_ONLY)}
        >
          lei
        </span>
      </TableCell>
    </TableGroupRow>
  );
}

/** What can be done to an Obiect or a Capitol. */
function SectionMenu({
  group,
  siblings,
  open,
}: {
  group: Group;
  siblings: Section[];
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const move = useMutation(api.estimates.sections.move);
  const remove = useMutation(api.estimates.sections.remove);
  const run = useRun();
  const [confirming, setConfirming] = useState(false);
  const { section } = group;
  const place = siblings.findIndex((sibling) => sibling._id === section._id);
  const isEmpty = group.items.length === 0 && group.chapters.length === 0;

  // Sections move among their siblings: right after the one two places up to
  // go up, after the next one to go down.
  const moveTo = (afterId: Id<"sections"> | undefined) =>
    run(() => move({ sectionId: section._id, afterId }));

  return (
    <DropdownMenu onOpenChange={(next) => !next && setConfirming(false)}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          // With a pointer it shows on the band it belongs to.
          className="size-8 focus-visible:opacity-100 data-[state=open]:opacity-100 group-hover/band:opacity-100 [@media(hover:hover)]:opacity-0"
          aria-label={t("sections.menu", { name: section.name })}
        >
          <Icons.More aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem
          onSelect={() => open({ kind: "addNorm", sectionId: section._id })}
        >
          {t("sections.addNormHere")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => open({ kind: "custom", sectionId: section._id })}
        >
          {t("sections.addCustomHere")}
        </DropdownMenuItem>
        {section.kind === "object" && (
          <DropdownMenuItem
            onSelect={() =>
              open({
                kind: "newSection",
                sectionKind: "chapter",
                parentId: section._id,
              })
            }
          >
            {t("sections.addChapterHere")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => open({ kind: "section", section })}>
          {t("sections.rename")}
        </DropdownMenuItem>
        {place > 0 && (
          <DropdownMenuItem onSelect={() => moveTo(siblings[place - 2]?._id)}>
            {t("moveUp")}
          </DropdownMenuItem>
        )}
        {place < siblings.length - 1 && (
          <DropdownMenuItem onSelect={() => moveTo(siblings[place + 1]?._id)}>
            {t("moveDown")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onSelect={(event) => {
            if (!confirming) {
              event.preventDefault();
              setConfirming(true);
              return;
            }
            void run(
              () =>
                remove({
                  sectionId: section._id,
                  withContents: !isEmpty,
                }),
              t("sections.deleted", { name: section.name }),
            );
          }}
        >
          {confirming
            ? isEmpty
              ? t("confirmDelete")
              : t("sections.confirmDeleteAll")
            : t("sections.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ItemRows({
  item,
  index,
  nested,
  siblings,
  position,
  sections,
  lastItems,
  editable,
  expanded,
  onToggle,
  newNorm,
  newPrice,
  open,
}: {
  item: LineItem;
  index: number;
  nested: boolean;
  siblings: LineItem[];
  position: number;
  sections: Section[];
  lastItems: ReadonlyMap<string, Id<"lineItems">>;
  editable: boolean;
  expanded: boolean;
  onToggle: () => void;
  newNorm: boolean;
  newPrice: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const update = useMutation(api.estimates.lineItems.update);
  const run = useRun();
  const missingPrice = item.resources.some(
    (resource) => resource.priceSource === "missing",
  );
  const tags = [
    missingPrice && (
      <RowTag key="missing" tone="danger">
        {t("tags.missingPrice")}
      </RowTag>
    ),
    item.confidence !== undefined && (
      <RowTag key="ai" tone="ai">
        {t("tags.ai")}
      </RowTag>
    ),
    newPrice && (
      <RowTag key="price" tone="warning">
        {t("tags.oldPrice")}
      </RowTag>
    ),
    newNorm && (
      <RowTag key="norm" tone="warning">
        {t("tags.newNorm")}
      </RowTag>
    ),
  ]
    .filter(Boolean)
    .slice(0, 2);
  const detailsId = `item-${item._id}`;
  const unit = formatUnit(item.unit, locale);
  const price = formatMoney(unitPrice(item), locale);
  // Own items without a code are stored with a dash, for the printed forms.
  const code = item.code === "–" ? undefined : item.code;
  const source = useItemSource()(item);

  return (
    <>
      <TableRow className="items-row group/row [&>td]:py-2.5">
        <TableCell
          className={cn("align-top tabular-nums text-ink-3", FROM_MID)}
        >
          {index}
        </TableCell>
        <TableCell
          className={cn(
            "relative align-top",
            nested ? NESTED_ITEM_CELL : ITEM_CELL,
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className={cn(
              "group grid w-full min-w-0 gap-y-0.5 rounded-xs text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@container(min-width:38rem)]:grid-cols-[1rem_minmax(0,1fr)] [@container(min-width:38rem)]:gap-x-2",
              // Room for the row's menu, which floats at the cell's end.
              editable && "pr-9",
            )}
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "mt-0.5 size-4 text-ink-3 transition-transform",
                MID_UP,
                expanded && "rotate-90",
              )}
            />
            <span className="text-body text-ink">
              <span className={cn("tabular-nums text-ink-3", NARROW_ONLY)}>
                {index}.{" "}
              </span>
              <span className="group-hover:underline">{item.title}</span>
            </span>
            <span
              className={cn(
                "flex items-baseline justify-between gap-3 text-meta tabular-nums text-ink-3",
                NARROW_ONLY,
              )}
            >
              <span>
                {t("items.quantityTimesPrice", {
                  quantity: formatQuantity(item.quantity, locale),
                  unit,
                  price,
                })}
              </span>
              <span className="whitespace-nowrap text-body text-ink">
                {formatMoney(item.totals.total, locale)}
              </span>
            </span>
            {/* Tags on the code's line, so a tag never moves the title. */}
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3 [@container(min-width:38rem)]:col-start-2">
              <span>
                {item.tenderRef && (
                  <>
                    {t("tenderRef.position", {
                      position: item.tenderRef.position,
                    })}
                    {" · "}
                  </>
                )}
                {/* A phone has what it needs in the title and the amounts. */}
                {code && (
                  <span className="[@container(max-width:37.99rem)]:hidden">
                    {code}
                  </span>
                )}
                {code && source && (
                  <span className="[@container(max-width:37.99rem)]:hidden">
                    {" · "}
                  </span>
                )}
                {source}
                <span className={MID_ONLY}>
                  {(code || source) && " · "}
                  <span className="whitespace-nowrap tabular-nums">
                    {t("items.pricePerUnit", { price, unit })}
                  </span>
                </span>
              </span>
              {tags}
            </span>
          </button>
          {editable && (
            <div className="absolute right-1 top-1">
              <ItemMenu
                item={item}
                siblings={siblings}
                position={position}
                sections={sections}
                lastItems={lastItems}
                newNorm={newNorm}
                open={open}
              />
            </div>
          )}
        </TableCell>
        <TableCell
          className={cn("whitespace-nowrap text-right align-top", FROM_MID)}
        >
          <InlineNumber
            value={item.quantity}
            format={(value) => formatQuantity(value, locale)}
            label={t("quantityOf", { title: item.title })}
            disabled={!editable}
            // Up by the field's padding, level with the item's first line.
            className="-my-1.5 group-hover/row:border-input"
            onCommit={(quantity) =>
              run(() => update({ lineItemId: item._id, quantity }))
            }
          />
          <span className="ml-2 inline-block min-w-8 text-left text-ink-3">
            {unit}
          </span>
        </TableCell>
        <TableCell
          className={cn(
            "text-right align-top tabular-nums text-ink-2",
            FROM_WIDE,
          )}
        >
          {price}
        </TableCell>
        <TableCell
          className={cn("align-top text-right tabular-nums text-ink", FROM_MID)}
        >
          {formatMoney(item.totals.total, locale)}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow id={detailsId} className="hover:bg-transparent">
          <TableCell className={FROM_MID} />
          <TableCell
            colSpan={4}
            className={cn("pt-0", nested ? NESTED_ITEM_CELL : ITEM_CELL)}
          >
            {/* No width of its own, so the wide resource table scrolls
                inside the row instead of widening the whole table. */}
            <div className="grid w-0 min-w-full gap-2 pl-6">
              {item.tenderRef && <TenderRef item={item} />}
              {item.notes && (
                <p className="m-0 whitespace-pre-line text-body text-ink-2">
                  {item.notes}
                </p>
              )}
              <ResourceTable item={item} editable={editable} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * The tender's own position for a line item imported from its lists: the
 * number, code and text, and the authority's unit and quantity, which the
 * forms print whatever the Deviz counts in.
 */
function TenderRef({ item }: { item: LineItem }) {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const ref = item.tenderRef;
  if (!ref) {
    return null;
  }
  return (
    <div className="grid gap-0.5 rounded-md bg-sunken px-3 py-2 text-meta">
      <p className="m-0 text-caption text-ink-3">{t("tenderRef.title")}</p>
      <p className="m-0 text-ink-2">
        {[
          t("tenderRef.position", { position: ref.position }),
          ref.code,
          ref.quantity !== undefined && ref.unit
            ? `${formatQuantity(ref.quantity, locale)} ${formatUnit(ref.unit, locale)}`
            : undefined,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {ref.text && (
        <p className="m-0 whitespace-pre-line text-ink-2">{ref.text}</p>
      )}
    </div>
  );
}

/**
 * Where a line item comes from, when that's worth saying on its row: "normă
 * ROCKWOOL · v2", "articol propriu". A first version of a base norm, the usual
 * case, says nothing.
 */
function useItemSource() {
  const t = useScopedI18n("estimate");
  const normSource = useNormSource();
  return (item: LineItem): string | undefined => {
    if (item.origin !== "norm") {
      return t(`origins.${item.origin}`);
    }
    const norm = item.norm;
    if (!norm) {
      return t("origins.deletedNorm");
    }
    if (norm.source === "base" && norm.version <= 1) {
      return undefined;
    }
    const version = norm.version > 1 ? ` · v${norm.version}` : "";
    return `${normSource(norm)}${version}`;
  };
}

function ItemMenu({
  item,
  siblings,
  position,
  sections,
  lastItems,
  newNorm,
  open,
}: {
  item: LineItem;
  siblings: LineItem[];
  position: number;
  sections: Section[];
  lastItems: ReadonlyMap<string, Id<"lineItems">>;
  newNorm: boolean;
  open: OpenPanel;
}) {
  const t = useScopedI18n("estimate");
  const update = useMutation(api.estimates.lineItems.update);
  const move = useMutation(api.estimates.lineItems.move);
  const upgrade = useMutation(api.estimates.lineItems.upgradeNorm);
  const remove = useMutation(api.estimates.lineItems.remove);
  const run = useRun();
  const [confirming, setConfirming] = useState(false);
  const sectionId = item.sectionId ?? null;

  // Items move within their section: after the one two places up, or after
  // the next one. With no item before, it goes first.
  const moveAfter = (afterId: Id<"lineItems"> | undefined) =>
    run(() => move({ lineItemId: item._id, sectionId, afterId }));
  // Into another section, at its end.
  const moveTo = (target: Id<"sections"> | null) =>
    run(() =>
      move({
        lineItemId: item._id,
        sectionId: target,
        afterId: lastItems.get(target ?? ""),
      }),
    );

  return (
    <DropdownMenu onOpenChange={(next) => !next && setConfirming(false)}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          // With a pointer it shows on the row it belongs to.
          className="size-8 focus-visible:opacity-100 data-[state=open]:opacity-100 group-hover/row:opacity-100 [@media(hover:hover)]:opacity-0"
          aria-label={t("items.menu", { title: item.title })}
        >
          <Icons.More aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {item.confidence !== undefined && (
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => update({ lineItemId: item._id, confirm: true }),
                t("items.confirmed"),
              )
            }
          >
            {t("items.confirmAi")}
          </DropdownMenuItem>
        )}
        {newNorm && (
          <DropdownMenuItem
            onSelect={() =>
              run(() => upgrade({ lineItemId: item._id }), t("items.upgraded"))
            }
          >
            {t("items.upgradeNorm")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => open({ kind: "item", item })}>
          {t("items.edit")}
        </DropdownMenuItem>
        {position > 0 && (
          <DropdownMenuItem
            onSelect={() => moveAfter(siblings[position - 2]?._id)}
          >
            {t("moveUp")}
          </DropdownMenuItem>
        )}
        {position < siblings.length - 1 && (
          <DropdownMenuItem
            onSelect={() => moveAfter(siblings[position + 1]?._id)}
          >
            {t("moveDown")}
          </DropdownMenuItem>
        )}
        {sections.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t("items.moveTo")}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
              {item.sectionId && (
                <DropdownMenuItem onSelect={() => moveTo(null)}>
                  {t("sections.none")}
                </DropdownMenuItem>
              )}
              {orderedSections(sections)
                .filter(({ section }) => section._id !== item.sectionId)
                .map(({ section, nested }) => (
                  <DropdownMenuItem
                    key={section._id}
                    onSelect={() => moveTo(section._id)}
                  >
                    {nested ? `— ${section.name}` : section.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onSelect={(event) => {
            if (!confirming) {
              event.preventDefault();
              setConfirming(true);
              return;
            }
            void run(
              () => remove({ lineItemId: item._id }),
              t("items.deleted"),
            );
          }}
        >
          {confirming ? t("confirmDelete") : t("items.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
