"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { OpeningKind } from "@devize/backend/convex/takeoffs/measures";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Plus } from "lucide-react";
import { Fragment, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Nil } from "@/components/nil";
import { useRun } from "@/components/use-run";
import { formatQuantity } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { LockedNote } from "../../_components/locked-note";
import type { Room } from "./types";

const numberClass = "whitespace-nowrap text-right tabular-nums";
// What a room measures keeps its columns down to the tablet; its sides don't.
const resultClass = cn(numberClass, "hidden md:table-cell");
const sideClass = cn(numberClass, "hidden text-ink-2 xl:table-cell");

/** The rooms as the levels group them, in the order they were added. */
function byLevel(rooms: readonly Room[]) {
  const groups: { level: string | undefined; rooms: Room[] }[] = [];
  for (const room of rooms) {
    const last = groups.at(-1);
    if (last && last.level === room.level) {
      last.rooms.push(room);
    } else {
      groups.push({ level: room.level, rooms: [room] });
    }
  }
  return groups;
}

/**
 * The Camere of a Deviz: each with its sides, height, openings and what it
 * measures, and the totals for all of them.
 */
export function RoomsCard({
  estimateId,
  rooms,
  locked,
  onAdd,
  onEdit,
}: {
  estimateId: Id<"estimates">;
  rooms: readonly Room[];
  locked: boolean;
  onAdd: () => void;
  onEdit: (room: Room) => void;
}) {
  const t = useScopedI18n("takeoff.rooms");
  const tTakeoff = useScopedI18n("takeoff");
  const locale = useCurrentLocale();
  const sum = (pick: (room: Room) => number) =>
    Math.round(rooms.reduce((total, room) => total + pick(room), 0) * 100) /
    100;
  const groups = byLevel(rooms);
  // One level is no grouping: it's said once, by the section's name.
  const onlyLevel = groups.length === 1 ? groups[0]?.level : undefined;
  const grouped =
    groups.length > 1 && groups.some((group) => group.level !== undefined);

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div className="grid gap-1">
          <CardTitle>
            {t("title")}
            {onlyLevel && (
              <span className="font-normal text-ink-3"> · {onlyLevel}</span>
            )}
          </CardTitle>
          <CardDescription className="m-0">{t("description")}</CardDescription>
        </div>
        {!locked && rooms.length > 0 && (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        )}
        {locked && (
          <LockedNote
            estimateId={estimateId}
            label={tTakeoff("locked")}
            className="self-start pt-[3px]"
          />
        )}
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <EmptyState
            icon={<Icons.Worksite />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              !locked && (
                <Button onClick={onAdd}>
                  <Plus aria-hidden />
                  {t("add")}
                </Button>
              )
            }
          />
        ) : (
          <Table bleed stack>
            <TableHeader>
              <TableRow>
                {/* The numbers share the width; the words take what they need. */}
                <TableHead className="xl:w-[22%]">
                  {t("columns.room")}
                </TableHead>
                <TableHead className="hidden xl:table-cell xl:w-[18%]">
                  {t("columns.openings")}
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell xl:w-[10%]">
                  {t("columns.length")}
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell xl:w-[10%]">
                  {t("columns.width")}
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell xl:w-[10%]">
                  {t("columns.height")}
                </TableHead>
                <TableHead className="text-right xl:w-[10%]">
                  {t("columns.floor")}
                </TableHead>
                <TableHead className="text-right xl:w-[10%]">
                  {t("columns.walls")}
                </TableHead>
                <TableHead className="text-right xl:w-[10%]">
                  {t("columns.perimeter")}
                </TableHead>
                {!locked && <TableHead className="w-8" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group, index) => (
                <Fragment key={group.level ?? `level-${index}`}>
                  {grouped && (
                    <TableGroupRow ruled>
                      <TableCell colSpan={locked ? 8 : 9} data-stack="wide">
                        {group.level ?? "–"}
                      </TableCell>
                    </TableGroupRow>
                  )}
                  {group.rooms.map((room) => (
                    <RoomRow
                      key={room._id}
                      estimateId={estimateId}
                      room={room}
                      rooms={rooms}
                      locked={locked}
                      onEdit={onEdit}
                    />
                  ))}
                </Fragment>
              ))}
              <TableRow className="font-medium hover:bg-transparent md:[&>td]:border-t-[3px] md:[&>td]:border-double md:[&>td]:border-t-rule">
                <TableCell colSpan={5} className="hidden xl:table-cell">
                  {t("total")}
                </TableCell>
                <TableCell
                  data-stack="wide"
                  className="md:max-xl:pl-0 xl:hidden"
                >
                  {t("total")}
                  <span className="block text-meta font-normal tabular-nums text-ink-2 md:hidden">
                    {t("measures", {
                      floor: formatQuantity(
                        sum((room) => room.measures.floor),
                        locale,
                      ),
                      walls: formatQuantity(
                        sum((room) => room.measures.walls),
                        locale,
                      ),
                      perimeter: formatQuantity(
                        sum((room) => room.measures.perimeter),
                        locale,
                      ),
                    })}
                  </span>
                </TableCell>
                <TableCell className={resultClass}>
                  {formatQuantity(
                    sum((room) => room.measures.floor),
                    locale,
                  )}
                </TableCell>
                <TableCell className={resultClass}>
                  {formatQuantity(
                    sum((room) => room.measures.walls),
                    locale,
                  )}
                </TableCell>
                <TableCell className={resultClass}>
                  {formatQuantity(
                    sum((room) => room.measures.perimeter),
                    locale,
                  )}
                </TableCell>
                {!locked && <TableCell className="hidden md:table-cell" />}
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** "1 ușă", "2 ferestre". */
function openingsOf(
  room: Room,
  t: ReturnType<typeof useScopedI18n<"takeoff.rooms">>,
) {
  const counts: Record<OpeningKind, number> = { door: 0, window: 0, other: 0 };
  for (const opening of room.openings) {
    counts[opening.kind] += opening.count;
  }
  return [
    counts.door > 0 &&
      t(counts.door === 1 ? "openings.door" : "openings.doors", {
        count: counts.door,
      }),
    counts.window > 0 &&
      t(counts.window === 1 ? "openings.window" : "openings.windows", {
        count: counts.window,
      }),
    counts.other > 0 &&
      t(counts.other === 1 ? "openings.other" : "openings.others", {
        count: counts.other,
      }),
  ].filter(Boolean);
}

function RoomRow({
  estimateId,
  room,
  rooms,
  locked,
  onEdit,
}: {
  estimateId: Id<"estimates">;
  room: Room;
  rooms: readonly Room[];
  locked: boolean;
  onEdit: (room: Room) => void;
}) {
  const t = useScopedI18n("takeoff.rooms");
  const locale = useCurrentLocale();
  const save = useMutation(api.takeoffs.rooms.save);
  const move = useMutation(api.takeoffs.rooms.move);
  const remove = useMutation(api.takeoffs.rooms.remove);
  const run = useRun();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const place = rooms.findIndex((other) => other._id === room._id);
  const metres = (value: number | undefined) =>
    value === undefined ? <Nil /> : formatQuantity(value, locale);
  const openings = openingsOf(room, t);
  // Under the name where the columns for them are gone.
  const sides = [
    room.length !== undefined &&
      t("sides.length", { value: formatQuantity(room.length, locale) }),
    room.width !== undefined &&
      t("sides.width", { value: formatQuantity(room.width, locale) }),
    room.height !== undefined &&
      t("sides.height", { value: formatQuantity(room.height, locale) }),
  ]
    .filter(Boolean)
    .join(" × ");
  const details = [sides, ...openings].filter(Boolean).join(" · ");
  const irregular =
    room.floorArea !== undefined || room.perimeter !== undefined;

  const duplicate = () =>
    run(
      () =>
        save({
          estimateId,
          name: `${room.name} (2)`,
          level: room.level,
          length: room.length,
          width: room.width,
          height: room.height,
          floorArea: room.floorArea,
          perimeter: room.perimeter,
          openings: room.openings,
          notes: room.notes,
        }),
      t("copied"),
    );

  const confirmRemove = async () => {
    setBusy(true);
    const result = await run(() => remove({ roomId: room._id }), t("removed"));
    setBusy(false);
    if (result.ok) {
      setConfirming(false);
    }
  };

  return (
    <TableRow className="group/row md:max-xl:[&>td]:align-baseline">
      <TableCell>
        <div className="grid justify-items-start">
          <span className="text-ink">{room.name}</span>
          {irregular && (
            <span className="text-meta text-ink-3">{t("measuredSides")}</span>
          )}
          {room.notes && (
            <span className="text-meta text-ink-3">{room.notes}</span>
          )}
          {details && (
            <span className="text-meta tabular-nums text-ink-3 xl:hidden">
              {details}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-ink-2 xl:table-cell">
        {openings.join(" · ")}
      </TableCell>
      <TableCell className={sideClass}>{metres(room.length)}</TableCell>
      <TableCell className={sideClass}>{metres(room.width)}</TableCell>
      <TableCell className={sideClass}>{metres(room.height)}</TableCell>
      <TableCell className={resultClass}>
        {formatQuantity(room.measures.floor, locale)}
      </TableCell>
      <TableCell className={resultClass}>
        {formatQuantity(room.measures.walls, locale)}
      </TableCell>
      <TableCell className={cn(resultClass, locked && "md:pr-0")}>
        {formatQuantity(room.measures.perimeter, locale)}
      </TableCell>
      {!locked && (
        <TableCell className="w-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-my-1.5 size-8 text-ink-3 focus-visible:opacity-100 data-[state=open]:opacity-100 group-hover/row:opacity-100 [@media(hover:hover)]:opacity-0"
                aria-label={t("actions", { name: room.name })}
              >
                <Icons.More aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(room)}>
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void duplicate()}>
                {t("duplicate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={place <= 0}
                onSelect={() =>
                  void run(() => move({ roomId: room._id, direction: "up" }))
                }
              >
                {t("moveUp")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={place >= rooms.length - 1}
                onSelect={() =>
                  void run(() => move({ roomId: room._id, direction: "down" }))
                }
              >
                {t("moveDown")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger"
                onSelect={() => setConfirming(true)}
              >
                {t("remove")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            title={t("confirmTitle", { name: room.name })}
            description={t("confirmDescription")}
            confirm={t("confirm")}
            destructive
            busy={busy}
            onConfirm={() => void confirmRemove()}
          />
        </TableCell>
      )}
      <TableCell
        data-stack="wide"
        className="text-meta tabular-nums text-ink-2 md:hidden"
      >
        {t("measures", {
          floor: formatQuantity(room.measures.floor, locale),
          walls: formatQuantity(room.measures.walls, locale),
          perimeter: formatQuantity(room.measures.perimeter, locale),
        })}
      </TableCell>
    </TableRow>
  );
}
