"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  measuresOf,
  type OpeningKind,
  type RoomOpening,
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
import { Input } from "@devize/ui/input";
import { Label } from "@devize/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { Switch } from "@devize/ui/switch";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { formatInputNumber, formatQuantity } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { evaluateExpression } from "./expression";
import type { Room } from "./types";

const openingKinds: readonly OpeningKind[] = ["door", "window", "other"];

type OpeningDraft = {
  key: number;
  kind: OpeningKind;
  label: string;
  count: string;
  width: string;
  height: string;
};

/** A dimension typed, or nothing; undefined when it isn't a number. */
function dimension(text: string): number | undefined | null {
  if (!text.trim()) {
    return null;
  }
  const value = evaluateExpression(text);
  return value !== undefined && value > 0 ? value : undefined;
}

/** A room of the Deviz: its name, dimensions, openings and notes. */
export function RoomDialog({
  estimateId,
  room,
  onClose,
}: {
  estimateId: Id<"estimates">;
  // A room to change, "new" for a new one, or null when closed.
  room: Room | "new" | null;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={room !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        closeLabel={tc("close")}
        className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto"
      >
        {room && (
          <RoomForm
            key={room === "new" ? "new" : room._id}
            estimateId={estimateId}
            room={room === "new" ? undefined : room}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoomForm({
  estimateId,
  room,
  onDone,
}: {
  estimateId: Id<"estimates">;
  room: Room | undefined;
  onDone: () => void;
}) {
  const t = useScopedI18n("takeoff.room");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const save = useMutation(api.takeoffs.rooms.save);
  const run = useRun();
  const number = (value: number | undefined) =>
    value === undefined ? "" : formatInputNumber(value, locale);
  const [name, setName] = useState(room?.name ?? "");
  const [level, setLevel] = useState(room?.level ?? "");
  const [length, setLength] = useState(number(room?.length));
  const [width, setWidth] = useState(number(room?.width));
  const [height, setHeight] = useState(number(room?.height));
  const [irregular, setIrregular] = useState(
    room?.floorArea !== undefined || room?.perimeter !== undefined,
  );
  const [floorArea, setFloorArea] = useState(number(room?.floorArea));
  const [perimeter, setPerimeter] = useState(number(room?.perimeter));
  const [openings, setOpenings] = useState<OpeningDraft[]>(() =>
    (room?.openings ?? []).map((opening, key) => ({
      key,
      kind: opening.kind,
      label: opening.label ?? "",
      count: number(opening.count),
      width: number(opening.width),
      height: number(opening.height),
    })),
  );
  const [notes, setNotes] = useState(room?.notes ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // What the form says so far, or undefined while a field is wrong.
  const read = () => {
    const sides = [length, width, height].map(dimension);
    const area = irregular ? dimension(floorArea) : null;
    const around = irregular ? dimension(perimeter) : null;
    if (
      sides.includes(undefined) ||
      area === undefined ||
      around === undefined
    ) {
      return undefined;
    }
    const list: RoomOpening[] = [];
    for (const opening of openings) {
      const count = dimension(opening.count);
      const w = dimension(opening.width);
      const h = dimension(opening.height);
      if (!count || !w || !h) {
        return undefined;
      }
      list.push({
        kind: opening.kind,
        label: opening.label.trim() || undefined,
        count,
        width: w,
        height: h,
      });
    }
    return {
      name: name.trim(),
      level: level.trim() || undefined,
      length: sides[0] ?? undefined,
      width: sides[1] ?? undefined,
      height: sides[2] ?? undefined,
      floorArea: area ?? undefined,
      perimeter: around ?? undefined,
      openings: list,
      notes: notes.trim() || undefined,
    };
  };
  const draft = read();
  const preview = draft ? measuresOf(draft) : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const fields = read();
    if (!fields?.name) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        save(
          room ? { roomId: room._id, ...fields } : { estimateId, ...fields },
        ),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  const updateOpening = (key: number, patch: Partial<OpeningDraft>) =>
    setOpenings((list) =>
      list.map((opening) =>
        opening.key === key ? { ...opening, ...patch } : opening,
      ),
    );
  const addOpening = (kind: OpeningKind) =>
    setOpenings((list) => [
      ...list,
      {
        key: (list.at(-1)?.key ?? -1) + 1,
        kind,
        label: "",
        count: "1",
        width: kind === "window" ? "1,2" : "0,9",
        height: kind === "window" ? "1,4" : "2,1",
      },
    ]);

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>
          {room ? t("editTitle", { name: room.name }) : t("newTitle")}
        </DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label={t("name")} htmlFor="room-name">
          <Input
            id="room-name"
            value={name}
            placeholder={t("namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
          />
        </Field>
        <Field label={t("level")} htmlFor="room-level">
          <Input
            id="room-level"
            value={level}
            placeholder={t("levelPlaceholder")}
            onChange={(event) => setLevel(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label={t("length")} htmlFor="room-length">
          <DecimalInput
            id="room-length"
            suffix="m"
            value={length}
            onChange={(event) => setLength(event.target.value)}
          />
        </Field>
        <Field label={t("width")} htmlFor="room-width">
          <DecimalInput
            id="room-width"
            suffix="m"
            value={width}
            onChange={(event) => setWidth(event.target.value)}
          />
        </Field>
        <Field label={t("height")} htmlFor="room-height">
          <DecimalInput
            id="room-height"
            suffix="m"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <Switch
            id="room-irregular"
            checked={irregular}
            onCheckedChange={setIrregular}
          />
          <Label htmlFor="room-irregular">{t("irregular")}</Label>
        </div>
        {irregular && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("floorArea")} htmlFor="room-floor">
              <DecimalInput
                id="room-floor"
                suffix="mp"
                value={floorArea}
                onChange={(event) => setFloorArea(event.target.value)}
              />
            </Field>
            <Field
              label={t("perimeter")}
              htmlFor="room-perimeter"
              hint={t("irregularHint")}
            >
              <DecimalInput
                id="room-perimeter"
                suffix="m"
                value={perimeter}
                onChange={(event) => setPerimeter(event.target.value)}
              />
            </Field>
          </div>
        )}
      </div>
      <fieldset className="m-0 grid gap-3 border-0 p-0">
        <legend className="mb-1 grid gap-0.5 p-0">
          <span className="text-body font-medium text-ink">
            {t("openings")}
          </span>
          <span className="text-meta text-ink-3">{t("openingsHint")}</span>
        </legend>
        {openings.map((opening, index) => (
          <div
            key={opening.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_4rem_5rem_5rem_auto]"
          >
            <Field
              label={t("opening.kind")}
              htmlFor={`opening-kind-${opening.key}`}
            >
              <Select
                value={opening.kind}
                onValueChange={(next) =>
                  updateOpening(opening.key, { kind: next as OpeningKind })
                }
              >
                <SelectTrigger id={`opening-kind-${opening.key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {openingKinds.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(`kinds.${kind}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={t("opening.label")}
              htmlFor={`opening-label-${opening.key}`}
            >
              <Input
                id={`opening-label-${opening.key}`}
                value={opening.label}
                placeholder={t("opening.labelPlaceholder")}
                onChange={(event) =>
                  updateOpening(opening.key, { label: event.target.value })
                }
              />
            </Field>
            <Field
              label={t("opening.count")}
              htmlFor={`opening-count-${opening.key}`}
            >
              <DecimalInput
                id={`opening-count-${opening.key}`}
                value={opening.count}
                onChange={(event) =>
                  updateOpening(opening.key, { count: event.target.value })
                }
              />
            </Field>
            <Field
              label={t("opening.width")}
              htmlFor={`opening-width-${opening.key}`}
            >
              <DecimalInput
                id={`opening-width-${opening.key}`}
                suffix="m"
                value={opening.width}
                onChange={(event) =>
                  updateOpening(opening.key, { width: event.target.value })
                }
              />
            </Field>
            <Field
              label={t("opening.height")}
              htmlFor={`opening-height-${opening.key}`}
            >
              <DecimalInput
                id={`opening-height-${opening.key}`}
                suffix="m"
                value={opening.height}
                onChange={(event) =>
                  updateOpening(opening.key, { height: event.target.value })
                }
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-ink-3"
              aria-label={`${t("opening.remove")} ${index + 1}`}
              onClick={() =>
                setOpenings((list) => list.filter((o) => o.key !== opening.key))
              }
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addOpening("door")}
          >
            <Plus aria-hidden />
            {t("kinds.door")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addOpening("window")}
          >
            <Plus aria-hidden />
            {t("kinds.window")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addOpening("other")}
          >
            <Plus aria-hidden />
            {t("kinds.other")}
          </Button>
        </div>
      </fieldset>
      <Field label={t("notes")} htmlFor="room-notes">
        <Textarea
          id="room-notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      <p
        role="status"
        className={
          error ? "m-0 text-meta text-danger" : "m-0 text-meta text-ink-2"
        }
      >
        {error ??
          (preview
            ? t("preview", {
                floor: formatQuantity(preview.floor, locale),
                walls: formatQuantity(preview.walls, locale),
                perimeter: formatQuantity(preview.perimeter, locale),
                skirting: formatQuantity(preview.skirting, locale),
              })
            : t("invalid"))}
      </p>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
