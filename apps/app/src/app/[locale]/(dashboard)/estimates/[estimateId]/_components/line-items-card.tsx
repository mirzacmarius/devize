"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Badge, Count } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { ChevronRight, Lock, Plus } from "lucide-react";
import { Fragment, useState } from "react";
import { InlineNumber } from "@/components/inline-number";
import { useRun } from "@/components/use-run";
import { formatMoney, formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { groupLines, type NumberedItem, type SectionGroup } from "./groups";
import { useNormSource } from "./norm-source";
import { ResourceTable } from "./resource-table";
import { orderedSections } from "./section-select";
import type { Estimate, LineItem, OpenPanel, Section, Updates } from "./types";

type Group = SectionGroup<Section, LineItem>;

const COLUMNS = 6;

// The card is a size container, so the columns follow its width, not the
// screen's: beside the checks at 1280 px it's narrower than alone at 1024 px.
// A narrow card drops the number and quantity columns, a mid-size one the
// unit price, and the item's own lines then show what they held.
const FROM_MID = "hidden [@container(min-width:38rem)]:table-cell";
const FROM_WIDE = "hidden [@container(min-width:50rem)]:table-cell";
const NARROW_ONLY = "[@container(min-width:38rem)]:hidden";
const MID_ONLY =
  "hidden [@container(min-width:38rem)]:inline [@container(min-width:50rem)]:hidden";
// With no number column, the item column starts at the card's edge.
const ITEM_CELL = "pl-0 [@container(min-width:38rem)]:pl-3";
const NESTED_ITEM_CELL = "pl-3 [@container(min-width:38rem)]:pl-6";

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
            colSpan={COLUMNS - 1}
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
            {/* An empty Deviz offers these two in its empty state. */}
            {!isEmpty && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => open({ kind: "addNorm" })}
                >
                  <Plus aria-hidden />
                  {t("items.addNorm")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => open({ kind: "custom" })}
                >
                  {t("items.addCustom")}
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {t("items.addSection")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4 [container-type:inline-size]">
        {!editable && (
          <p className="m-0 flex items-center gap-2 rounded-md bg-sunken px-3 py-2 text-meta text-ink-2">
            <Lock className="size-4 shrink-0" aria-hidden />
            {t("items.locked")}
          </p>
        )}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-10", FROM_MID)}>#</TableHead>
                <TableHead className={ITEM_CELL}>
                  {t("items.columns.item")}
                </TableHead>
                <TableHead className={cn("text-right", FROM_MID)}>
                  {t("items.columns.quantity")}
                </TableHead>
                <TableHead className={cn("text-right", FROM_WIDE)}>
                  {t("items.columns.unitPrice")}
                </TableHead>
                {/* A narrow card lets the head wrap, as its numbers are shorter. */}
                <TableHead className="whitespace-normal text-right [@container(min-width:38rem)]:whitespace-nowrap">
                  {t("items.columns.value")}
                </TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">{t("items.columns.actions")}</span>
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
    // The same cells as an item row, since which columns show depends on the
    // card's width and a span can't follow it.
    <TableRow className="bg-sunken hover:bg-sunken">
      <TableCell className={FROM_MID} />
      <TableCell className={nested ? NESTED_ITEM_CELL : ITEM_CELL}>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="text-label uppercase text-ink-3">
            {section.kind === "object"
              ? t("sections.object")
              : t("sections.chapter")}
          </span>
          {section.code && (
            <span className="font-mono text-code text-ink-3">
              {section.code}
            </span>
          )}
          <span className="text-body font-medium text-ink">{section.name}</span>
        </div>
      </TableCell>
      <TableCell className={FROM_MID} />
      <TableCell className={FROM_WIDE} />
      <TableCell className="text-right font-medium tabular-nums">
        {formatMoney(group.total, locale)}
      </TableCell>
      <TableCell>
        {editable && (
          <DropdownMenu onOpenChange={(next) => !next && setConfirming(false)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("sections.menu", { name: section.name })}
              >
                <Icons.More aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem
                onSelect={() =>
                  open({ kind: "addNorm", sectionId: section._id })
                }
              >
                {t("sections.addNormHere")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  open({ kind: "custom", sectionId: section._id })
                }
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
              <DropdownMenuItem
                onSelect={() => open({ kind: "section", section })}
              >
                {t("sections.rename")}
              </DropdownMenuItem>
              {place > 0 && (
                <DropdownMenuItem
                  onSelect={() => moveTo(siblings[place - 2]?._id)}
                >
                  {t("moveUp")}
                </DropdownMenuItem>
              )}
              {place < siblings.length - 1 && (
                <DropdownMenuItem
                  onSelect={() => moveTo(siblings[place + 1]?._id)}
                >
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
        )}
      </TableCell>
    </TableRow>
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
      <Badge key="missing" tone="danger">
        {t("tags.missingPrice")}
      </Badge>
    ),
    item.confidence !== undefined && (
      <Badge key="ai" tone="ai">
        {t("tags.ai")}
      </Badge>
    ),
    newPrice && (
      <Badge key="price" tone="warning">
        {t("tags.oldPrice")}
      </Badge>
    ),
    newNorm && (
      <Badge key="norm" tone="warning">
        {t("tags.newNorm")}
      </Badge>
    ),
  ]
    .filter(Boolean)
    .slice(0, 2);
  const detailsId = `item-${item._id}`;
  const unit = formatUnit(item.unit, locale);
  const price = formatMoney(unitPrice(item), locale);
  // Own items without a code are stored with a dash, for the printed forms.
  const code = item.code === "—" ? undefined : item.code;

  return (
    <>
      <TableRow>
        <TableCell
          className={cn("align-top tabular-nums text-ink-3", FROM_MID)}
        >
          {index}
        </TableCell>
        <TableCell
          className={cn("align-top", nested ? NESTED_ITEM_CELL : ITEM_CELL)}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className="group grid w-full min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 rounded-xs text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "mt-0.5 size-4 text-ink-3 transition-transform",
                expanded && "rotate-90",
              )}
            />
            {/* Tags after the title, or on their own line under a long one. */}
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink">
              <span>
                <span className={cn("tabular-nums text-ink-3", NARROW_ONLY)}>
                  {index}.{" "}
                </span>
                <span className="group-hover:underline">{item.title}</span>
              </span>
              {tags.length > 0 && (
                <span className="inline-flex gap-1">{tags}</span>
              )}
            </span>
            <span
              className={cn(
                "col-start-2 text-meta tabular-nums text-ink-2",
                NARROW_ONLY,
              )}
            >
              {t("items.quantityTimesPrice", {
                quantity: formatQuantity(item.quantity, locale),
                unit,
                price,
              })}
            </span>
            <span className="col-start-2 text-meta text-ink-3">
              {code && (
                <>
                  <span className="font-mono text-code">{code}</span>
                  {" · "}
                </>
              )}
              <ItemSource item={item} />
              <span className={MID_ONLY}>
                {" · "}
                <span className="whitespace-nowrap">
                  {t("items.pricePerUnit", { price, unit })}
                </span>
              </span>
            </span>
          </button>
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
            className="-my-1.5 w-24"
            onCommit={(quantity) =>
              run(() => update({ lineItemId: item._id, quantity }))
            }
          />
          <span className="ml-1 inline-block min-w-8 text-left text-ink-3">
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
        <TableCell className="align-top text-right tabular-nums text-ink">
          {formatMoney(item.totals.total, locale)}
        </TableCell>
        <TableCell className="align-top">
          {editable && (
            <ItemMenu
              item={item}
              siblings={siblings}
              position={position}
              sections={sections}
              lastItems={lastItems}
              newNorm={newNorm}
              open={open}
            />
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow id={detailsId} className="hover:bg-transparent">
          <TableCell className={FROM_MID} />
          <TableCell
            colSpan={COLUMNS - 1}
            className={cn("pt-0", nested ? NESTED_ITEM_CELL : ITEM_CELL)}
          >
            {/* No width of its own, so the wide resource table scrolls
                inside the row instead of widening the whole table. */}
            <div className="grid w-0 min-w-full gap-2 pl-6">
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

/** Where a line item comes from: "normă ROCKWOOL · v2", "articol propriu". */
function ItemSource({ item }: { item: LineItem }) {
  const t = useScopedI18n("estimate");
  const normSource = useNormSource();
  if (item.origin !== "norm") {
    return <>{t(`origins.${item.origin}`)}</>;
  }
  const norm = item.norm;
  if (!norm) {
    return <>{t("origins.deletedNorm")}</>;
  }
  return (
    <>
      {normSource(norm)}
      {norm.version > 1 && ` · v${norm.version}`}
    </>
  );
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
          className="size-8"
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
