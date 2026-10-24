import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { readLineItems, readSections } from "../estimates/helpers";
import { requireFirmDoc } from "../lib/access";
import { differs, measuredOf, readRooms, readTakeoffs } from "./helpers";
import { guessMeasure, measuresFor, measuresOf } from "./measures";

// The Antemăsurătoare page and the card on the Deviz's page: the rooms with
// what they measure, each Articol with its takeoffs and whether its quantity
// still says what they measure.

/** A takeoff as the page shows it. */
function takeoffView(takeoff: Doc<"takeoffs">) {
  return {
    _id: takeoff._id,
    lineItemId: takeoff.lineItemId,
    method: takeoff.method,
    title: takeoff.title,
    unit: takeoff.unit,
    rows: takeoff.rows,
    total: takeoff.total,
    rooms: takeoff.rooms,
    // An AI wrote it and nobody checked it yet.
    unchecked: takeoff.confidence !== undefined,
  };
}

async function loaded(ctx: QueryCtx, estimateId: Id<"estimates">) {
  const { doc: estimate } = await requireFirmDoc(ctx, "estimates", estimateId);
  const [items, rooms, takeoffs] = await Promise.all([
    readLineItems(ctx, estimate._id),
    readRooms(ctx, estimate._id),
    readTakeoffs(ctx, estimate._id),
  ]);
  const byItem = new Map<Id<"lineItems">, Doc<"takeoffs">[]>();
  const orphans: Doc<"takeoffs">[] = [];
  for (const takeoff of takeoffs) {
    if (takeoff.lineItemId) {
      byItem.set(takeoff.lineItemId, [
        ...(byItem.get(takeoff.lineItemId) ?? []),
        takeoff,
      ]);
    } else {
      orphans.push(takeoff);
    }
  }
  return { estimate, items, rooms, takeoffs, byItem, orphans };
}

/** The Antemăsurătoare of a Deviz: its rooms, and its Articole with theirs. */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { estimate, items, rooms, byItem, orphans } = await loaded(
      ctx,
      args.estimateId,
    );
    const sections = await readSections(ctx, estimate._id);
    return {
      estimate: {
        _id: estimate._id,
        organizationId: estimate.organizationId,
        number: estimate.number,
        revision: estimate.revision,
        title: estimate.title,
        locked: estimate.lockedAt !== undefined,
      },
      sections: sections.map((section) => ({
        _id: section._id,
        kind: section.kind,
        parentId: section.parentId,
        code: section.code,
        name: section.name,
        position: section.position,
      })),
      rooms: rooms.map((room) => ({ ...room, measures: measuresOf(room) })),
      items: items.map((item) => {
        const takeoffs = byItem.get(item._id) ?? [];
        const measured = measuredOf(takeoffs);
        return {
          _id: item._id,
          sectionId: item.sectionId,
          position: item.position,
          code: item.code,
          title: item.title,
          unit: item.unit,
          quantity: item.quantity,
          takeoffs: takeoffs.map(takeoffView),
          measured,
          differs: takeoffs.length > 0 && differs(item.quantity, measured),
          // What of a room the Articol could measure, and the likeliest.
          measures: measuresFor(item.unit),
          suggested: guessMeasure(item.title, item.unit),
        };
      }),
      orphans: orphans.map(takeoffView),
    };
  },
});

/** The Antemăsurătoare in numbers, for the card on the Deviz's page. */
export const summary = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { items, rooms, takeoffs, byItem, orphans } = await loaded(
      ctx,
      args.estimateId,
    );
    let measured = 0;
    const drifted: { _id: Id<"lineItems">; title: string }[] = [];
    for (const item of items) {
      const own = byItem.get(item._id) ?? [];
      if (own.length === 0) {
        continue;
      }
      measured += 1;
      if (differs(item.quantity, measuredOf(own))) {
        drifted.push({ _id: item._id, title: item.title });
      }
    }
    return {
      rooms: rooms.length,
      items: items.length,
      measured,
      takeoffs: takeoffs.length,
      orphans: orphans.length,
      // An AI's takeoffs nobody checked yet.
      unchecked: takeoffs.filter((takeoff) => takeoff.confidence !== undefined)
        .length,
      drifted,
    };
  },
});

/** The rooms and the takeoffs, for the Anexă · Antemăsurătoare. */
export const forExport = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { rooms, takeoffs } = await loaded(ctx, args.estimateId);
    return {
      rooms: rooms.map((room) => ({
        _id: room._id,
        name: room.name,
        level: room.level,
        length: room.length,
        width: room.width,
        height: room.height,
        floorArea: room.floorArea,
        perimeter: room.perimeter,
        openings: room.openings,
        notes: room.notes,
        measures: measuresOf(room),
      })),
      takeoffs: takeoffs.map((takeoff) => ({
        _id: takeoff._id,
        lineItemId: takeoff.lineItemId,
        method: takeoff.method,
        title: takeoff.title,
        unit: takeoff.unit,
        rows: takeoff.rows,
        total: takeoff.total,
        measure: takeoff.rooms?.measure,
      })),
    };
  },
});
