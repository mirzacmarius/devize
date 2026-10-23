import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { refreshTotals } from "../estimates/helpers";
import {
  limits,
  measuresFor,
  type RoomMeasure,
  roomRows,
  takeoffTotal,
} from "./measures";

// What the rooms and the takeoffs of a Deviz share: reading them, writing
// a takeoff's rows from its rooms, and keeping each Articol's quantity at
// the sum of its takeoffs.

/** All of a Deviz's rooms, in order. */
export async function readRooms(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"rooms">[]> {
  return await ctx.db
    .query("rooms")
    .withIndex("by_estimateId_and_position", (q) =>
      q.eq("estimateId", estimateId),
    )
    .take(limits.rooms);
}

/** All of a Deviz's takeoffs, oldest first. */
export async function readTakeoffs(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<Doc<"takeoffs">[]> {
  return await ctx.db
    .query("takeoffs")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimateId))
    .take(limits.rooms * 4);
}

/** The takeoffs of one Articol, oldest first. */
export async function takeoffsOf(
  ctx: QueryCtx,
  lineItemId: Id<"lineItems">,
): Promise<Doc<"takeoffs">[]> {
  return await ctx.db
    .query("takeoffs")
    .withIndex("by_lineItemId", (q) => q.eq("lineItemId", lineItemId))
    .take(limits.takeoffsPerItem + 1);
}

/** The sum of some takeoffs' totals, in their Articol's unit. */
export function measuredOf(takeoffs: readonly { total: number }[]): number {
  return (
    Math.round(
      takeoffs.reduce((sum, takeoff) => sum + takeoff.total, 0) * 1000,
    ) / 1000
  );
}

/** Whether an Articol's quantity is another than its takeoffs measure. */
export function differs(quantity: number, measured: number): boolean {
  return Math.abs(quantity - measured) > 0.0005;
}

/** The rows and total a measure of some rooms writes for an Articol's unit. */
export function roomTakeoff(
  measure: RoomMeasure,
  rooms: readonly Doc<"rooms">[],
  unit: string,
) {
  const rows = roomRows(measure, rooms);
  return { rows, total: takeoffTotal(rows, unit) };
}

/** Whether an Articol in `unit` can take `measure` from rooms. */
export function allowsMeasure(unit: string, measure: RoomMeasure): boolean {
  return measuresFor(unit).includes(measure);
}

/**
 * Sets an Articol's quantity to what its takeoffs measure, when it has any.
 * Returns whether the quantity changed; the caller refreshes the totals.
 */
export async function syncQuantity(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  lineItemId: Id<"lineItems">,
): Promise<boolean> {
  const item = await ctx.db.get("lineItems", lineItemId);
  if (!item || item.estimateId !== estimate._id) {
    return false;
  }
  const takeoffs = await takeoffsOf(ctx, lineItemId);
  if (takeoffs.length === 0) {
    return false;
  }
  const measured = measuredOf(takeoffs);
  if (!differs(item.quantity, measured)) {
    return false;
  }
  await ctx.db.patch("lineItems", item._id, {
    quantity: measured,
    updatedAt: Date.now(),
  });
  return true;
}

/** Syncs the quantities of some Articole and, when one changed, the totals. */
export async function syncQuantities(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  lineItemIds: Iterable<Id<"lineItems"> | undefined>,
) {
  let changed = false;
  for (const lineItemId of new Set(lineItemIds)) {
    if (lineItemId && (await syncQuantity(ctx, estimate, lineItemId))) {
      changed = true;
    }
  }
  if (changed) {
    await refreshTotals(ctx, estimate);
  } else {
    await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
  }
}

/**
 * Writes again the takeoffs that measure a room, after it changed or was
 * removed; a takeoff left with no room goes too. Then the Articole follow.
 */
export async function refreshRoomTakeoffs(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  roomId: Id<"rooms">,
  removed: boolean,
) {
  const rooms = await readRooms(ctx, estimate._id);
  const byId = new Map(rooms.map((room) => [room._id, room]));
  const touched: (Id<"lineItems"> | undefined)[] = [];
  for (const takeoff of await readTakeoffs(ctx, estimate._id)) {
    if (!takeoff.rooms?.roomIds.includes(roomId)) {
      continue;
    }
    const roomIds = removed
      ? takeoff.rooms.roomIds.filter((id) => id !== roomId)
      : takeoff.rooms.roomIds;
    const measured = roomIds.flatMap((id) => {
      const room = byId.get(id);
      return room ? [room] : [];
    });
    if (measured.length === 0) {
      await ctx.db.delete("takeoffs", takeoff._id);
    } else {
      await ctx.db.patch("takeoffs", takeoff._id, {
        rooms: { measure: takeoff.rooms.measure, roomIds },
        ...roomTakeoff(takeoff.rooms.measure, measured, takeoff.unit),
        updatedAt: Date.now(),
      });
    }
    touched.push(takeoff.lineItemId);
  }
  await syncQuantities(ctx, estimate, touched);
}

/**
 * Copies a Deviz's rooms and takeoffs onto its copy or revision, with the
 * new ids of its Articole and rooms.
 */
export async function copyTakeoffs(
  ctx: MutationCtx,
  source: Doc<"estimates">,
  estimateId: Id<"estimates">,
  itemIds: ReadonlyMap<Id<"lineItems">, Id<"lineItems">>,
) {
  const now = Date.now();
  const roomIds = new Map<Id<"rooms">, Id<"rooms">>();
  for (const room of await readRooms(ctx, source._id)) {
    const { _id: oldId, _creationTime: time, ...fields } = room;
    roomIds.set(
      oldId,
      await ctx.db.insert("rooms", { ...fields, estimateId, updatedAt: now }),
    );
  }
  for (const takeoff of await readTakeoffs(ctx, source._id)) {
    const { _id: oldId, _creationTime: time, ...fields } = takeoff;
    const rooms = fields.rooms && {
      measure: fields.rooms.measure,
      roomIds: fields.rooms.roomIds.flatMap((id) => {
        const newId = roomIds.get(id);
        return newId ? [newId] : [];
      }),
    };
    if (rooms && rooms.roomIds.length === 0) {
      continue;
    }
    await ctx.db.insert("takeoffs", {
      ...fields,
      estimateId,
      lineItemId: fields.lineItemId
        ? itemIds.get(fields.lineItemId)
        : undefined,
      rooms,
      updatedAt: now,
    });
  }
}
