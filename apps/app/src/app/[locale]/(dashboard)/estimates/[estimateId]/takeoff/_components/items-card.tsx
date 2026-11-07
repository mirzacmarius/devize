"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { StatusPill } from "@devize/ui/status-pill";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Fragment } from "react";
import { useRun } from "@/components/use-run";
import { formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { groupLines } from "../../_components/groups";
import type { Item, Room, Section, Takeoff, Target } from "./types";

type Grouped = Item & { totals: { total: number } };

// A group's heading, as on the Deviz: a band over the titles, and what it comes
// to, here how many of its Articole are measured, at the end.
const bandClass =
  "-mx-[var(--card-pad)] flex min-h-9 items-center justify-between gap-4 rounded-md bg-sunken py-1 pl-[calc(var(--card-pad)+1.75rem)] pr-[var(--card-pad)] text-body font-medium text-ink";

/**
 * The Articole of a Deviz with their Antemăsurători: each measured from the
 * rooms or by rows typed by hand, and whether its quantity still says what
 * they measure. Takeoffs whose Articol is gone close the list.
 */
export function ItemsCard({
  sections,
  items,
  orphans,
  rooms,
  locked,
  onRows,
  onFromRooms,
}: {
  sections: readonly Section[];
  items: readonly Item[];
  orphans: readonly Takeoff[];
  rooms: readonly Room[];
  locked: boolean;
  onRows: (target: Target) => void;
  onFromRooms: (target: Target) => void;
}) {
  const t = useScopedI18n("takeoff.items");
  const groups = groupLines(
    sections,
    items.map((item): Grouped => ({ ...item, totals: { total: 0 } })),
  );
  const sectionName = (section: Section) =>
    section.code ? `${section.code} ${section.name}` : section.name;
  const measuredCount = (list: readonly { item: Grouped }[]) => (
    <span className="shrink-0 whitespace-nowrap font-normal tabular-nums text-ink-2">
      {t("sectionCount", {
        measured: list.filter(({ item }) => item.takeoffs.length > 0).length,
        total: list.length,
      })}
    </span>
  );
  const rows = (list: readonly { item: Grouped; index: number }[]) =>
    list.map(({ item, index }) => (
      <ItemRow
        key={item._id}
        item={item}
        index={index}
        rooms={rooms}
        locked={locked}
        onRows={onRows}
        onFromRooms={onFromRooms}
      />
    ));

  return (
    <Card id="items" className="scroll-mt-4">
      <CardHeader className="grid justify-items-start gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="m-0">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={<Icons.Articles />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <ul className="m-0 grid list-none p-0">
            <li
              aria-hidden
              className={cn(
                "hidden pb-2.5 text-head text-ink-3 md:grid",
                COLUMNS,
                groups.loose.length > 0 && "border-b border-rule",
              )}
            >
              <span className="col-start-2">{t("columnItem")}</span>
              <span>{t("columnState")}</span>
              <span className="pr-9 text-right">{t("columnInEstimate")}</span>
            </li>
            {rows(groups.loose)}
            {groups.sections.map((group) => (
              <Fragment key={group.section._id}>
                <li data-group className={bandClass}>
                  {sectionName(group.section)}
                  {measuredCount([
                    ...group.items,
                    ...group.chapters.flatMap((chapter) => chapter.items),
                  ])}
                </li>
                {rows(group.items)}
                {group.chapters.map((chapter) => (
                  <Fragment key={chapter.section._id}>
                    <li data-group className={cn(bandClass, "font-normal")}>
                      {sectionName(chapter.section)}
                      {measuredCount(chapter.items)}
                    </li>
                    {rows(chapter.items)}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </ul>
        )}
        {orphans.length > 0 && (
          <Orphans orphans={orphans} items={items} locked={locked} />
        )}
      </CardContent>
    </Card>
  );
}

/** From a tablet up: a row's number, title, state and quantity in the Deviz. */
const COLUMNS = "md:grid-cols-[1.75rem_minmax(0,1fr)_11rem_7rem]";

function ItemRow({
  item,
  index,
  rooms,
  locked,
  onRows,
  onFromRooms,
}: {
  item: Item;
  index: number;
  rooms: readonly Room[];
  locked: boolean;
  onRows: (target: Target) => void;
  onFromRooms: (target: Target) => void;
}) {
  const t = useScopedI18n("takeoff.items");
  const tMeasures = useScopedI18n("takeoff.measures");
  const locale = useCurrentLocale();
  const apply = useMutation(api.takeoffs.takeoffs.apply);
  const run = useRun();
  const unit = formatUnit(item.unit, locale);
  const measured = item.takeoffs.length > 0;
  const unchecked = item.takeoffs.some((takeoff) => takeoff.unchecked);
  const canMeasureRooms = item.measures.length > 0;
  const state = (
    <>
      {measured ? (
        <StatusPill tone={item.differs ? "warning" : "success"}>
          {item.differs
            ? t("differs")
            : t("measured", {
                measured: formatQuantity(item.measured, locale),
                unit,
              })}
        </StatusPill>
      ) : (
        <StatusPill tone="draft">{t("unmeasured")}</StatusPill>
      )}
      {unchecked && <StatusPill tone="ai">{t("unchecked")}</StatusPill>}
    </>
  );

  return (
    <li className="grid gap-1.5 border-b border-border py-3 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div
          className={cn(
            "grid min-w-0 flex-1 basis-64 grid-cols-[1.75rem_minmax(0,1fr)] gap-y-0.5 md:basis-full md:items-baseline md:gap-x-0",
            COLUMNS,
          )}
        >
          <span className="w-4 text-right text-body tabular-nums text-ink-3">
            {index}
          </span>
          <span className="text-body text-ink md:pr-4">{item.title}</span>
          <span className="hidden min-w-0 flex-wrap gap-x-2 gap-y-0.5 text-ink-3 md:flex">
            {state}
          </span>
          <span className="hidden text-right text-body tabular-nums text-ink md:block">
            <span className="sr-only">{t("columnInEstimate")}: </span>
            {formatQuantity(item.quantity, locale)}
            <span className="ml-2 inline-block w-7 text-left text-ink-3">
              {unit}
            </span>
          </span>
          <span className="col-start-2 flex flex-wrap items-center gap-2 text-meta text-ink-3">
            <span className="tabular-nums">
              {item.code}
              <span className="md:hidden">
                {" · "}
                {t("inEstimate", {
                  quantity: formatQuantity(item.quantity, locale),
                  unit,
                })}
              </span>
            </span>
            <span className="contents md:hidden">{state}</span>
          </span>
        </div>
        {!locked && (
          <div className="flex flex-wrap gap-2 md:pl-7">
            {item.differs && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void run(() => apply({ lineItemId: item._id }), t("applied"))
                }
              >
                {t("apply")}
              </Button>
            )}
            {canMeasureRooms && (
              <Button
                variant={measured ? "ghost" : "outline"}
                size="sm"
                disabled={rooms.length === 0}
                title={rooms.length === 0 ? t("noRooms") : undefined}
                onClick={() => onFromRooms({ item })}
              >
                <Icons.Worksite aria-hidden />
                {item.suggested && !measured
                  ? t("fromRoomsSuggested", {
                      measure: tMeasures(item.suggested).toLowerCase(),
                    })
                  : t("fromRooms")}
              </Button>
            )}
            <Button
              variant={measured || canMeasureRooms ? "ghost" : "outline"}
              size="sm"
              onClick={() => onRows({ item })}
            >
              <Plus aria-hidden />
              {t("addRows")}
            </Button>
          </div>
        )}
      </div>
      {item.takeoffs.length > 0 && (
        <ul className="m-0 grid list-none p-0">
          {item.takeoffs.map((takeoff) => (
            <TakeoffLine
              key={takeoff._id}
              item={item}
              takeoff={takeoff}
              rooms={rooms}
              locked={locked}
              onRows={onRows}
              onFromRooms={onFromRooms}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** What a takeoff is called: its title, else how it was made. */
function TakeoffName({ takeoff }: { takeoff: Takeoff }) {
  const t = useScopedI18n("takeoff");
  if (takeoff.title) {
    return <>{takeoff.title}</>;
  }
  return <>{t(`methods.${takeoff.method}`)}</>;
}

function TakeoffLine({
  item,
  takeoff,
  rooms,
  locked,
  onRows,
  onFromRooms,
}: {
  item: Item;
  takeoff: Takeoff;
  rooms: readonly Room[];
  locked: boolean;
  onRows: (target: Target) => void;
  onFromRooms: (target: Target) => void;
}) {
  const t = useScopedI18n("takeoff.items");
  const tMeasures = useScopedI18n("takeoff.measures");
  const locale = useCurrentLocale();
  const remove = useMutation(api.takeoffs.takeoffs.remove);
  const run = useRun();
  const names = new Map(rooms.map((room) => [room._id, room.name]));
  const roomNames = takeoff.rooms?.roomIds
    .map((id) => names.get(id))
    .filter(Boolean)
    .join(", ");
  return (
    <li className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 text-meta">
      <span className="min-w-0 flex-1 basis-56 text-ink-3">
        <span className="text-ink-2">
          <TakeoffName takeoff={takeoff} />
        </span>
        {" · "}
        {takeoff.rooms
          ? t("roomsOf", {
              measure: tMeasures(takeoff.rooms.measure).toLowerCase(),
              rooms: roomNames ?? "",
            })
          : takeoff.rows.length === 1
            ? t("row")
            : t("rows", { count: takeoff.rows.length })}
      </span>
      <span className="flex items-center gap-1">
        <span className="tabular-nums text-ink-2">
          {formatQuantity(takeoff.total, locale)}{" "}
          {formatUnit(takeoff.unit, locale)}
        </span>
        {!locked && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-ink-3 [&_svg]:size-3.5"
              aria-label={t("edit")}
              onClick={() =>
                takeoff.rooms
                  ? onFromRooms({ item, takeoff })
                  : onRows({ item, takeoff })
              }
            >
              <Pencil aria-hidden />
            </Button>
            {takeoff.rooms && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-ink-3 [&_svg]:size-3.5"
                aria-label={t("addRows")}
                onClick={() => onRows({ item, takeoff })}
              >
                <Icons.Survey aria-hidden />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-ink-3 [&_svg]:size-3.5"
              aria-label={t("remove")}
              onClick={() =>
                void run(() => remove({ takeoffId: takeoff._id }), t("removed"))
              }
            >
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
      </span>
    </li>
  );
}

/** Takeoffs without an Articol: to hang on one, or to remove. */
function Orphans({
  orphans,
  items,
  locked,
}: {
  orphans: readonly Takeoff[];
  items: readonly Item[];
  locked: boolean;
}) {
  const t = useScopedI18n("takeoff.items");
  const locale = useCurrentLocale();
  const link = useMutation(api.takeoffs.takeoffs.link);
  const remove = useMutation(api.takeoffs.takeoffs.remove);
  const run = useRun();
  return (
    <div className="mt-6 grid gap-2">
      <h3 className="m-0 text-title-card text-ink">{t("orphansTitle")}</h3>
      <p className="m-0 text-meta text-ink-3">{t("orphansDescription")}</p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {orphans.map((takeoff) => (
          <li
            key={takeoff._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-body"
          >
            <span className="min-w-0 flex-1 basis-56">
              <span className="text-ink">
                <TakeoffName takeoff={takeoff} />
              </span>
              <span className="text-ink-3">
                {" · "}
                {formatQuantity(takeoff.total, locale)}{" "}
                {formatUnit(takeoff.unit, locale)}
              </span>
            </span>
            {!locked && (
              <span className="flex items-center gap-2">
                <Select
                  onValueChange={(lineItemId) =>
                    void run(
                      () =>
                        link({
                          takeoffId: takeoff._id,
                          lineItemId: lineItemId as Id<"lineItems">,
                        }),
                      t("linked"),
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-56" aria-label={t("linkTo")}>
                    <SelectValue placeholder={t("linkTo")} />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-ink-3"
                  aria-label={t("remove")}
                  onClick={() =>
                    void run(
                      () => remove({ takeoffId: takeoff._id }),
                      t("removed"),
                    )
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
