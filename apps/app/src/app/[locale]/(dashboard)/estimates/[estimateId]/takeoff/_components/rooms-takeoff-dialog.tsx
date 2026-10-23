"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  measureUnit,
  type RoomMeasure,
  roomRows,
  takeoffTotal,
} from "@devize/backend/convex/takeoffs/measures";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Room, Target } from "./types";

/**
 * Writes an Articol's Antemăsurătoare from the Deviz's rooms: what to
 * measure, and which rooms. The rows follow the rooms from then on.
 */
export function RoomsTakeoffDialog({
  target,
  rooms,
  onClose,
}: {
  target: Target | null;
  rooms: readonly Room[];
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        closeLabel={tc("close")}
        className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
      >
        {target && (
          <RoomsTakeoffForm
            key={target.takeoff?._id ?? `new-${target.item._id}`}
            target={target}
            rooms={rooms}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoomsTakeoffForm({
  target,
  rooms,
  onDone,
}: {
  target: Target;
  rooms: readonly Room[];
  onDone: () => void;
}) {
  const t = useScopedI18n("takeoff.roomsDialog");
  const tMeasures = useScopedI18n("takeoff.measures");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const fromRooms = useMutation(api.takeoffs.takeoffs.fromRooms);
  const run = useRun();
  const { item, takeoff } = target;
  const measures = item.measures;
  const [measure, setMeasure] = useState<RoomMeasure | undefined>(
    takeoff?.rooms?.measure ?? item.suggested ?? measures[0],
  );
  const [chosen, setChosen] = useState<ReadonlySet<Id<"rooms">>>(
    () => new Set(takeoff?.rooms?.roomIds ?? rooms.map((room) => room._id)),
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const unit = formatUnit(item.unit, locale);
  const selected = rooms.filter((room) => chosen.has(room._id));
  const total = measure
    ? takeoffTotal(roomRows(measure, selected), item.unit)
    : 0;

  const toggle = (roomId: Id<"rooms">, on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      if (on) {
        next.add(roomId);
      } else {
        next.delete(roomId);
      }
      return next;
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!measure || selected.length === 0) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        fromRooms({
          takeoffId: takeoff?._id,
          lineItemId: takeoff ? undefined : item._id,
          measure,
          roomIds: selected.map((room) => room._id),
          title: takeoff?.title,
        }),
      t("saved", { total: formatQuantity(total, locale), unit }),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("title", { title: item.title })}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      {measures.length === 0 ? (
        <p className="m-0 text-body text-ink-2">{t("noMeasures", { unit })}</p>
      ) : (
        <>
          <Field label={t("measure")} htmlFor="takeoff-measure">
            <Select
              value={measure}
              onValueChange={(next) => setMeasure(next as RoomMeasure)}
            >
              <SelectTrigger id="takeoff-measure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {measures.map((option) => (
                  <SelectItem key={option} value={option}>
                    {tMeasures(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-1 flex w-full items-center justify-between p-0">
              <span className="text-body font-medium text-ink">
                {t("rooms")}
              </span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setChosen(new Set(rooms.map((r) => r._id)))}
                >
                  {t("all")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setChosen(new Set())}
                >
                  {t("none")}
                </Button>
              </span>
            </legend>
            <ul className="m-0 grid max-h-72 list-none gap-1 overflow-y-auto p-0">
              {rooms.map((room) => (
                <li key={room._id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-body hover:bg-sunken">
                    <input
                      type="checkbox"
                      checked={chosen.has(room._id)}
                      onChange={(event) =>
                        toggle(room._id, event.target.checked)
                      }
                      className="size-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {room.level ? `${room.level} · ${room.name}` : room.name}
                    </span>
                    {measure && (
                      <span className="tabular-nums text-ink-3">
                        {formatQuantity(room.measures[measure], locale)}{" "}
                        {formatUnit(measureUnit(measure), locale)}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <p
            role="status"
            className={
              error
                ? "m-0 text-body text-danger"
                : "m-0 text-body font-medium tabular-nums text-ink"
            }
          >
            {error ??
              t("preview", {
                total: formatQuantity(total, locale),
                unit,
                count: selected.length,
              })}
          </p>
        </>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={saving || measures.length === 0 || selected.length === 0}
        >
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
