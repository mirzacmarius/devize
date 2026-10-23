import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { refreshTotals, requireEditableEstimate } from "../estimates/helpers";
import { roomMeasure, takeoffRow } from "../estimates/validators";
import { requireFirmDoc } from "../lib/access";
import { invalid, notFound } from "../lib/errors";
import {
  allowsMeasure,
  readRooms,
  roomTakeoff,
  syncQuantities,
  takeoffsOf,
} from "./helpers";
import { cleanLabel, cleanRows, limits, takeoffTotal } from "./measures";

// Antemăsurători: the rows behind an Articol's quantity, typed by hand or
// written from the Deviz's Camere. Saving or removing one sets the Articol's
// quantity to what all its takeoffs measure.

/** An Articol of the Deviz, for a takeoff to hang on. */
async function requireItem(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  lineItemId: Id<"lineItems">,
) {
  const item = await ctx.db.get("lineItems", lineItemId);
  if (!item || item.estimateId !== estimate._id) {
    throw notFound("lineItem");
  }
  if ((await takeoffsOf(ctx, lineItemId)).length >= limits.takeoffsPerItem) {
    throw invalid("takeoffs");
  }
  return item;
}

/** A takeoff and its Deviz, which must still be a draft. */
async function requireEditableTakeoff(
  ctx: MutationCtx,
  takeoffId: Id<"takeoffs">,
) {
  const { doc: takeoff } = await requireFirmDoc(ctx, "takeoffs", takeoffId);
  const { estimate, userId } = await requireEditableEstimate(
    ctx,
    takeoff.estimateId,
  );
  return { takeoff, estimate, userId };
}

/**
 * Saves a takeoff typed by hand: new rows on a new takeoff of an Articol, or
 * on one that exists, which then stops following its rooms. Rows an AI
 * wrote count as checked once a person saves them.
 */
export const save = mutation({
  args: {
    takeoffId: v.optional(v.id("takeoffs")),
    lineItemId: v.optional(v.id("lineItems")),
    title: v.optional(v.string()),
    rows: v.array(takeoffRow),
  },
  returns: v.id("takeoffs"),
  handler: async (ctx, args) => {
    const rows = cleanRows(args.rows);
    if (!rows) {
      throw invalid("rows");
    }
    const title = cleanLabel(args.title, limits.label);
    const now = Date.now();
    if (args.takeoffId) {
      const { takeoff, estimate } = await requireEditableTakeoff(
        ctx,
        args.takeoffId,
      );
      await ctx.db.patch("takeoffs", takeoff._id, {
        title,
        rows,
        total: takeoffTotal(rows, takeoff.unit),
        method: takeoff.rooms ? "manual" : takeoff.method,
        rooms: undefined,
        confidence: undefined,
        updatedAt: now,
      });
      await syncQuantities(ctx, estimate, [takeoff.lineItemId]);
      return takeoff._id;
    }
    if (!args.lineItemId) {
      throw notFound("lineItem");
    }
    const { doc: item } = await requireFirmDoc(
      ctx,
      "lineItems",
      args.lineItemId,
    );
    const { estimate, userId } = await requireEditableEstimate(
      ctx,
      item.estimateId,
    );
    await requireItem(ctx, estimate, item._id);
    const takeoffId = await ctx.db.insert("takeoffs", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      lineItemId: item._id,
      method: "manual",
      title,
      unit: item.unit,
      rows,
      total: takeoffTotal(rows, item.unit),
      createdBy: userId,
      updatedAt: now,
    });
    await syncQuantities(ctx, estimate, [item._id]);
    return takeoffId;
  },
});

/**
 * Writes a takeoff from the Deviz's rooms: a measure of the rooms chosen,
 * in the Articol's unit. Changing the rooms later writes it again.
 */
export const fromRooms = mutation({
  args: {
    takeoffId: v.optional(v.id("takeoffs")),
    lineItemId: v.optional(v.id("lineItems")),
    measure: roomMeasure,
    roomIds: v.array(v.id("rooms")),
    title: v.optional(v.string()),
  },
  returns: v.id("takeoffs"),
  handler: async (ctx, args) => {
    const title = cleanLabel(args.title, limits.label);
    const now = Date.now();
    const roomsOf = async (estimate: Doc<"estimates">) => {
      const all = await readRooms(ctx, estimate._id);
      const wanted = new Set(args.roomIds);
      const rooms = all.filter((room) => wanted.has(room._id));
      if (rooms.length === 0 || rooms.length !== wanted.size) {
        throw notFound("room");
      }
      return rooms;
    };
    if (args.takeoffId) {
      const { takeoff, estimate } = await requireEditableTakeoff(
        ctx,
        args.takeoffId,
      );
      if (!allowsMeasure(takeoff.unit, args.measure)) {
        throw invalid("measure");
      }
      const rooms = await roomsOf(estimate);
      await ctx.db.patch("takeoffs", takeoff._id, {
        title,
        method: "rooms",
        rooms: { measure: args.measure, roomIds: rooms.map((r) => r._id) },
        ...roomTakeoff(args.measure, rooms, takeoff.unit),
        confidence: undefined,
        updatedAt: now,
      });
      await syncQuantities(ctx, estimate, [takeoff.lineItemId]);
      return takeoff._id;
    }
    if (!args.lineItemId) {
      throw notFound("lineItem");
    }
    const { doc: item } = await requireFirmDoc(
      ctx,
      "lineItems",
      args.lineItemId,
    );
    const { estimate, userId } = await requireEditableEstimate(
      ctx,
      item.estimateId,
    );
    await requireItem(ctx, estimate, item._id);
    if (!allowsMeasure(item.unit, args.measure)) {
      throw invalid("measure");
    }
    const rooms = await roomsOf(estimate);
    const takeoffId = await ctx.db.insert("takeoffs", {
      organizationId: estimate.organizationId,
      estimateId: estimate._id,
      lineItemId: item._id,
      method: "rooms",
      title,
      unit: item.unit,
      rooms: { measure: args.measure, roomIds: rooms.map((r) => r._id) },
      ...roomTakeoff(args.measure, rooms, item.unit),
      createdBy: userId,
      updatedAt: now,
    });
    await syncQuantities(ctx, estimate, [item._id]);
    return takeoffId;
  },
});

/** Removes a takeoff; its Articol keeps its quantity when none is left. */
export const remove = mutation({
  args: { takeoffId: v.id("takeoffs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { takeoff, estimate } = await requireEditableTakeoff(
      ctx,
      args.takeoffId,
    );
    await ctx.db.delete("takeoffs", takeoff._id);
    await syncQuantities(ctx, estimate, [takeoff.lineItemId]);
    return null;
  },
});

/**
 * Hangs a takeoff left without an Articol (its Articol was removed, or an
 * AI measured something the Deviz doesn't have yet) on an Articol.
 */
export const link = mutation({
  args: { takeoffId: v.id("takeoffs"), lineItemId: v.id("lineItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { takeoff, estimate } = await requireEditableTakeoff(
      ctx,
      args.takeoffId,
    );
    const item = await requireItem(ctx, estimate, args.lineItemId);
    if (takeoff.rooms && !allowsMeasure(item.unit, takeoff.rooms.measure)) {
      throw invalid("measure");
    }
    await ctx.db.patch("takeoffs", takeoff._id, {
      lineItemId: item._id,
      unit: item.unit,
      total: takeoffTotal(takeoff.rows, item.unit),
      updatedAt: Date.now(),
    });
    await syncQuantities(ctx, estimate, [takeoff.lineItemId, item._id]);
    return null;
  },
});

/**
 * Puts what an Articol's takeoffs measure back in its quantity, after
 * someone typed another quantity on the Deviz.
 */
export const apply = mutation({
  args: { lineItemId: v.id("lineItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: item } = await requireFirmDoc(
      ctx,
      "lineItems",
      args.lineItemId,
    );
    const { estimate } = await requireEditableEstimate(ctx, item.estimateId);
    await syncQuantities(ctx, estimate, [item._id]);
    await refreshTotals(ctx, estimate);
    return null;
  },
});
