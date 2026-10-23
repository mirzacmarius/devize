"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Badge } from "@devize/ui/badge";
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
    <Card>
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
          <ul className="m-0 grid list-none gap-2 p-0">
            {rows(groups.loose)}
            {groups.sections.map((group) => (
              <Fragment key={group.section._id}>
                <li className="pt-2 text-meta font-medium uppercase text-ink-3">
                  {sectionName(group.section)}
                </li>
                {rows(group.items)}
                {group.chapters.map((chapter) => (
                  <Fragment key={chapter.section._id}>
                    <li className="pl-3 pt-1 text-meta font-medium uppercase text-ink-3">
                      {sectionName(chapter.section)}
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

  return (
    <li
      className={cn(
        "grid gap-2 rounded-md border border-border px-3 py-3",
        !measured && "bg-sunken",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="grid min-w-0 flex-1 basis-64 gap-0.5">
          <span className="text-body text-ink">
            <span className="text-ink-3 tabular-nums">{index}.</span>{" "}
            {item.title}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-meta text-ink-3">
            <span>{item.code}</span>
            <span>
              {t("inEstimate", {
                quantity: formatQuantity(item.quantity, locale),
                unit,
              })}
            </span>
            {measured ? (
              <Badge tone={item.differs ? "warning" : "success"}>
                {item.differs
                  ? t("differs")
                  : t("measured", {
                      measured: formatQuantity(item.measured, locale),
                      unit,
                    })}
              </Badge>
            ) : (
              <Badge>{t("unmeasured")}</Badge>
            )}
            {unchecked && <Badge tone="ai">{t("unchecked")}</Badge>}
          </span>
        </div>
        {!locked && (
          <div className="flex flex-wrap gap-2">
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
        <ul className="m-0 grid list-none gap-1 p-0">
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
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-sm bg-sunken px-3 py-1.5 text-meta">
      <span className="min-w-0 flex-1 basis-56 text-ink-2">
        <span className="text-ink">
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
        <span className="tabular-nums text-ink">
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
