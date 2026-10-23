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
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { Fragment, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRun } from "@/components/use-run";
import { formatQuantity } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Room } from "./types";

const headClass = "pb-2 pl-3 text-right text-label uppercase text-ink-3";
const cellClass =
  "whitespace-nowrap py-2 pl-3 text-right align-top tabular-nums";

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
  const locale = useCurrentLocale();
  const sum = (pick: (room: Room) => number) =>
    Math.round(rooms.reduce((total, room) => total + pick(room), 0) * 100) /
    100;
  const groups = byLevel(rooms);
  const grouped = groups.some((group) => group.level !== undefined);

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div className="grid gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription className="m-0">{t("description")}</CardDescription>
        </div>
        {!locked && rooms.length > 0 && (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-body">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-label uppercase text-ink-3">
                    {t("columns.room")}
                  </th>
                  <th className={headClass}>{t("columns.length")}</th>
                  <th className={headClass}>{t("columns.width")}</th>
                  <th className={headClass}>{t("columns.height")}</th>
                  <th className="pb-2 pl-3 text-left text-label uppercase text-ink-3">
                    {t("columns.openings")}
                  </th>
                  <th className={headClass}>{t("columns.floor")}</th>
                  <th className={headClass}>{t("columns.walls")}</th>
                  <th className={headClass}>{t("columns.perimeter")}</th>
                  {!locked && <th className="w-10 pb-2" />}
                </tr>
              </thead>
              <tbody>
                {groups.map((group, index) => (
                  <Fragment key={group.level ?? `level-${index}`}>
                    {grouped && (
                      <tr className="border-t border-border">
                        <td
                          colSpan={locked ? 8 : 9}
                          className="pt-3 pb-1 text-meta font-medium uppercase text-ink-3"
                        >
                          {group.level ?? "–"}
                        </td>
                      </tr>
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
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td colSpan={5} className="py-2">
                    {t("total")}
                  </td>
                  <td className={cellClass}>
                    {formatQuantity(
                      sum((room) => room.measures.floor),
                      locale,
                    )}{" "}
                    <span className="text-ink-3">mp</span>
                  </td>
                  <td className={cellClass}>
                    {formatQuantity(
                      sum((room) => room.measures.walls),
                      locale,
                    )}{" "}
                    <span className="text-ink-3">mp</span>
                  </td>
                  <td className={cellClass}>
                    {formatQuantity(
                      sum((room) => room.measures.perimeter),
                      locale,
                    )}{" "}
                    <span className="text-ink-3">m</span>
                  </td>
                  {!locked && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** "1 ușă · 2 ferestre", or a dash. */
function openingsText(
  room: Room,
  t: ReturnType<typeof useScopedI18n<"takeoff.rooms">>,
) {
  const counts: Record<OpeningKind, number> = { door: 0, window: 0, other: 0 };
  for (const opening of room.openings) {
    counts[opening.kind] += opening.count;
  }
  const parts = [
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
  return parts.length > 0 ? parts.join(" · ") : "–";
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
    value === undefined ? "–" : formatQuantity(value, locale);
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
    <tr className="border-t border-border">
      <td className="py-2 align-top">
        <div className="grid justify-items-start">
          <span className="text-ink">{room.name}</span>
          {irregular && (
            <span className="text-meta text-ink-3">{t("measuredSides")}</span>
          )}
          {room.notes && (
            <span className="text-meta text-ink-3">{room.notes}</span>
          )}
        </div>
      </td>
      <td className={cellClass}>{metres(room.length)}</td>
      <td className={cellClass}>{metres(room.width)}</td>
      <td className={cellClass}>{metres(room.height)}</td>
      <td className="py-2 pl-3 align-top text-meta text-ink-2">
        {openingsText(room, t)}
      </td>
      <td className={cellClass}>
        {formatQuantity(room.measures.floor, locale)}
      </td>
      <td className={cellClass}>
        {formatQuantity(room.measures.walls, locale)}
      </td>
      <td className={cellClass}>
        {formatQuantity(room.measures.perimeter, locale)}
      </td>
      {!locked && (
        <td className="py-1 pl-2 text-right align-top">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-ink-3"
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
        </td>
      )}
    </tr>
  );
}
