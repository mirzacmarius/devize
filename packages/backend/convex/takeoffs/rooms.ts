import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireEditableEstimate } from "../estimates/helpers";
import { requireFirmDoc } from "../lib/access";
import { invalid, notFound } from "../lib/errors";
import { readRooms, refreshRoomTakeoffs } from "./helpers";
import { cleanRoom, limits } from "./measures";
import { roomOpening } from "./validators";

// Camere: the rooms of a Deviz, from which the Articole linked to them are
// measured. Changing a room writes again every takeoff that measures it,
// and the Articole follow (docs/adr: Antemăsurătoare).

const roomFields = {
  name: v.string(),
  level: v.optional(v.string()),
  length: v.optional(v.number()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  floorArea: v.optional(v.number()),
  perimeter: v.optional(v.number()),
  openings: v.array(roomOpening),
  notes: v.optional(v.string()),
};

/** Adds a room to a Deviz, or changes one. */
export const save = mutation({
  args: {
    roomId: v.optional(v.id("rooms")),
    estimateId: v.optional(v.id("estimates")),
    ...roomFields,
  },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    const { roomId, estimateId, ...typed } = args;
    const room = cleanRoom(typed);
    if (!room) {
      throw invalid("room");
    }
    const now = Date.now();
    if (roomId) {
      const { doc: existing } = await requireFirmDoc(ctx, "rooms", roomId);
      const { estimate } = await requireEditableEstimate(
        ctx,
        existing.estimateId,
      );
      await ctx.db.patch("rooms", roomId, { ...room, updatedAt: now });
      await refreshRoomTakeoffs(ctx, estimate, roomId, false);
      return roomId;
    }
    if (!estimateId) {
      throw notFound("estimate");
    }
    const { estimate } = await requireEditableEstimate(ctx, estimateId);
    const rooms = await readRooms(ctx, estimate._id);
    if (rooms.length >= limits.rooms) {
      throw invalid("rooms");
    }
    const position = (rooms.at(-1)?.position ?? 0) + 1;
    const id = await ctx.db.insert("rooms", {
      ...room,
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      position,
      updatedAt: now,
    });
    await ctx.db.patch("estimates", estimate._id, { updatedAt: now });
    return id;
  },
});

/** Removes a room; the takeoffs that measured it alone go with it. */
export const remove = mutation({
  args: { roomId: v.id("rooms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: room } = await requireFirmDoc(ctx, "rooms", args.roomId);
    const { estimate } = await requireEditableEstimate(ctx, room.estimateId);
    await ctx.db.delete("rooms", room._id);
    await refreshRoomTakeoffs(ctx, estimate, room._id, true);
    return null;
  },
});

/** Moves a room before or after another, so the list reads like the plan. */
export const move = mutation({
  args: {
    roomId: v.id("rooms"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: room } = await requireFirmDoc(ctx, "rooms", args.roomId);
    const { estimate } = await requireEditableEstimate(ctx, room.estimateId);
    const rooms = await readRooms(ctx, estimate._id);
    const index = rooms.findIndex((other) => other._id === room._id);
    const other: Doc<"rooms"> | undefined =
      rooms[args.direction === "up" ? index - 1 : index + 1];
    if (!other) {
      return null;
    }
    await ctx.db.patch("rooms", room._id, { position: other.position });
    await ctx.db.patch("rooms", other._id, { position: room.position });
    await ctx.db.patch("estimates", estimate._id, { updatedAt: Date.now() });
    return null;
  },
});
