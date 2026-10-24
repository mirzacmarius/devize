import { defineTable } from "convex/server";
import { v } from "convex/values";
import { roomOpening } from "./validators";

export const takeoffTables = {
  // Camere: the rooms of a Deviz with their dimensions and openings, in
  // metres, from which the floor, walls, ceiling, perimeter and openings of
  // the Articole linked to them are measured (takeoffs/measures.ts).
  rooms: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    name: v.string(),
    // Groups the rooms: "Parter", "Etaj 1".
    level: v.optional(v.string()),
    length: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    // Measured on site or on the plan, for a room that isn't a rectangle;
    // they replace length × width and 2 × (length + width).
    floorArea: v.optional(v.number()),
    perimeter: v.optional(v.number()),
    openings: v.array(roomOpening),
    notes: v.optional(v.string()),
    position: v.number(),
    updatedAt: v.number(),
  }).index("by_estimateId_and_position", ["estimateId", "position"]),
};
