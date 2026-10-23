import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  firmOwner,
  publishedBaseNorm,
  setup,
  type TestConvex,
} from "../test.helper";

// A bathroom tiled on the walls, with made-up rooms and norms.

async function tiledEstimate(t: TestConvex) {
  const { normId } = await publishedBaseNorm(t);
  const firm = await firmOwner(t, "Ana");
  const estimateId = await firm.as.mutation(api.estimates.estimates.create, {
    organizationId: firm.organizationId,
    title: "Baie apartament Popescu",
  });
  const wallsId = await firm.as.mutation(api.estimates.lineItems.addFromNorm, {
    estimateId,
    normId,
    quantity: 10,
  });
  return { firm, estimateId, wallsId };
}

// A made-up custom Articol's only resource.
const labor = {
  kind: "labor" as const,
  name: "Muncitor",
  unit: "ora",
  quantity: 0.5,
  unitPrice: 40,
};

const bathroom = {
  name: "Baie",
  length: 2.5,
  width: 2,
  height: 2.4,
  openings: [{ kind: "door" as const, count: 1, width: 0.8, height: 2.05 }],
};

async function quantityOf(
  firm: Awaited<ReturnType<typeof firmOwner>>,
  estimateId: Id<"estimates">,
  lineItemId: Id<"lineItems">,
) {
  const estimate = await firm.as.query(api.estimates.estimates.get, {
    estimateId,
  });
  return estimate.lineItems.find((item) => item._id === lineItemId)?.quantity;
}

describe("takeoffs", () => {
  test("rows typed by hand set the Articol's quantity and the Deviz follows", async () => {
    const t = setup();
    const { firm, estimateId, wallsId } = await tiledEstimate(t);
    const before = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    const takeoffId = await firm.as.mutation(api.takeoffs.takeoffs.save, {
      lineItemId: wallsId,
      title: "Pereți baie",
      rows: [
        {
          label: "Perimetru × h",
          count: 1,
          length: 9,
          height: 2.4,
          deduct: false,
        },
        { label: "Ușă", count: 1, length: 0.8, height: 2.05, deduct: true },
      ],
    });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(19.96);
    const after = await firm.as.query(api.estimates.estimates.get, {
      estimateId,
    });
    // Each line rounds to bani, so the Deviz follows within a few bani.
    expect(after.totals.total).toBeCloseTo(
      (before.totals.total * 19.96) / 10,
      0,
    );

    // A second takeoff adds to the first; editing one changes the sum.
    const second = await firm.as.mutation(api.takeoffs.takeoffs.save, {
      lineItemId: wallsId,
      rows: [{ count: 2, length: 1, width: 0.5, deduct: false }],
    });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(20.96);
    await firm.as.mutation(api.takeoffs.takeoffs.save, {
      takeoffId: second,
      rows: [{ count: 1, length: 2, deduct: false }],
    });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(21.96);

    // Removing the last takeoff leaves the quantity as it was measured.
    await firm.as.mutation(api.takeoffs.takeoffs.remove, { takeoffId: second });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(19.96);
    await firm.as.mutation(api.takeoffs.takeoffs.remove, { takeoffId });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(19.96);
  });

  test("measure an Articol counted per 100 mp in its own unit", async () => {
    const t = setup();
    const { firm, estimateId } = await tiledEstimate(t);
    const itemId = await firm.as.mutation(api.estimates.lineItems.addCustom, {
      estimateId,
      title: "Curățarea pardoselii",
      unit: "100 mp",
      quantity: 1,
      resources: [labor],
    });
    await firm.as.mutation(api.takeoffs.takeoffs.save, {
      lineItemId: itemId,
      rows: [{ count: 1, length: 24.32, width: 10, deduct: false }],
    });
    expect(await quantityOf(firm, estimateId, itemId)).toBe(2.432);
  });

  test("refuse empty or wrong rows, and rows on another firm's Deviz", async () => {
    const t = setup();
    const { firm, wallsId } = await tiledEstimate(t);
    await expect(
      firm.as.mutation(api.takeoffs.takeoffs.save, {
        lineItemId: wallsId,
        rows: [],
      }),
    ).rejects.toThrow(/invalid/);
    await expect(
      firm.as.mutation(api.takeoffs.takeoffs.save, {
        lineItemId: wallsId,
        rows: [{ count: 1, length: -1, deduct: false }],
      }),
    ).rejects.toThrow(/invalid/);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.mutation(api.takeoffs.takeoffs.save, {
        lineItemId: wallsId,
        rows: [{ count: 1, deduct: false }],
      }),
    ).rejects.toThrow(/not_found/);
  });
});

describe("rooms", () => {
  test("measure the Articole linked to them and follow their changes", async () => {
    const t = setup();
    const { firm, estimateId, wallsId } = await tiledEstimate(t);
    const bathroomId = await firm.as.mutation(api.takeoffs.rooms.save, {
      estimateId,
      ...bathroom,
    });
    const hallId = await firm.as.mutation(api.takeoffs.rooms.save, {
      estimateId,
      name: "Hol",
      length: 3,
      width: 1.2,
      height: 2.4,
      openings: [],
    });
    const takeoffId = await firm.as.mutation(api.takeoffs.takeoffs.fromRooms, {
      lineItemId: wallsId,
      measure: "walls",
      roomIds: [bathroomId, hallId],
    });
    // Baie: 9 × 2,4 − 0,8 × 2,05 = 19,96; Hol: 8,4 × 2,4 = 20,16.
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(40.12);

    // A taller bathroom measures more walls.
    await firm.as.mutation(api.takeoffs.rooms.save, {
      roomId: bathroomId,
      ...bathroom,
      height: 2.6,
    });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(41.92);

    // The page shows the rooms, the takeoff and that the quantity agrees.
    const page = await firm.as.query(api.takeoffs.page.forEstimate, {
      estimateId,
    });
    expect(page.rooms.map((room) => [room.name, room.measures.walls])).toEqual([
      ["Baie", 21.76],
      ["Hol", 20.16],
    ]);
    const walls = page.items.find((item) => item._id === wallsId);
    expect(walls?.takeoffs.map((takeoff) => takeoff.method)).toEqual(["rooms"]);
    expect(walls?.measured).toBe(41.92);
    expect(walls?.differs).toBe(false);
    expect(walls?.suggested).toBe("walls");

    // A quantity typed on the Deviz shows as differing, until put back.
    await firm.as.mutation(api.estimates.lineItems.update, {
      lineItemId: wallsId,
      quantity: 45,
    });
    const drifted = await firm.as.query(api.takeoffs.page.summary, {
      estimateId,
    });
    expect(drifted.drifted.map((item) => item._id)).toEqual([wallsId]);
    expect([drifted.rooms, drifted.items, drifted.measured]).toEqual([2, 1, 1]);
    await firm.as.mutation(api.takeoffs.takeoffs.apply, {
      lineItemId: wallsId,
    });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(41.92);

    // Removing a room takes it out of the takeoff; removing the last room
    // removes the takeoff and leaves the quantity.
    await firm.as.mutation(api.takeoffs.rooms.remove, { roomId: hallId });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(21.76);
    await firm.as.mutation(api.takeoffs.rooms.remove, { roomId: bathroomId });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(21.76);
    const gone = await firm.as.query(api.takeoffs.page.forEstimate, {
      estimateId,
    });
    expect(gone.items[0]?.takeoffs).toEqual([]);
    expect(gone.rooms).toEqual([]);
    void takeoffId;
  });

  test("only measure what the Articol's unit allows", async () => {
    const t = setup();
    const { firm, estimateId, wallsId } = await tiledEstimate(t);
    const roomId = await firm.as.mutation(api.takeoffs.rooms.save, {
      estimateId,
      ...bathroom,
    });
    await expect(
      firm.as.mutation(api.takeoffs.takeoffs.fromRooms, {
        lineItemId: wallsId,
        measure: "skirting",
        roomIds: [roomId],
      }),
    ).rejects.toThrow(/invalid/);
    const skirtingId = await firm.as.mutation(
      api.estimates.lineItems.addCustom,
      {
        estimateId,
        title: "Plintă",
        unit: "ml",
        quantity: 0,
        resources: [labor],
      },
    );
    await firm.as.mutation(api.takeoffs.takeoffs.fromRooms, {
      lineItemId: skirtingId,
      measure: "skirting",
      roomIds: [roomId],
    });
    expect(await quantityOf(firm, estimateId, skirtingId)).toBe(8.2);
  });

  test("belong to the firm and freeze with a sent Deviz", async () => {
    const t = setup();
    const { firm, estimateId } = await tiledEstimate(t);
    const other = await firmOwner(t, "Bogdan");
    await expect(
      other.as.mutation(api.takeoffs.rooms.save, { estimateId, ...bathroom }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.as.query(api.takeoffs.page.forEstimate, { estimateId }),
    ).rejects.toThrow(/not_found/);
    const roomId = await firm.as.mutation(api.takeoffs.rooms.save, {
      estimateId,
      ...bathroom,
    });
    await firm.as.mutation(api.estimates.estimates.setStatus, {
      estimateId,
      status: "sent",
    });
    await expect(
      firm.as.mutation(api.takeoffs.rooms.save, {
        roomId,
        ...bathroom,
        height: 3,
      }),
    ).rejects.toThrow(/locked/);
    await expect(
      firm.as.mutation(api.takeoffs.rooms.remove, { roomId }),
    ).rejects.toThrow(/locked/);
  });

  test("go with the Deviz into its revision, with the takeoffs", async () => {
    const t = setup();
    const { firm, estimateId, wallsId } = await tiledEstimate(t);
    const roomId = await firm.as.mutation(api.takeoffs.rooms.save, {
      estimateId,
      ...bathroom,
    });
    await firm.as.mutation(api.takeoffs.takeoffs.fromRooms, {
      lineItemId: wallsId,
      measure: "walls",
      roomIds: [roomId],
    });
    const revisionId = await firm.as.mutation(
      api.estimates.estimates.duplicate,
      { estimateId, asRevision: true },
    );
    const page = await firm.as.query(api.takeoffs.page.forEstimate, {
      estimateId: revisionId,
    });
    expect(page.rooms).toHaveLength(1);
    expect(page.rooms[0]?._id).not.toBe(roomId);
    const [item] = page.items;
    expect(item?.takeoffs[0]?.rooms?.roomIds).toEqual([page.rooms[0]?._id]);
    expect(item?.measured).toBe(19.96);
    // The revision's rooms are its own: changing one leaves the original.
    await firm.as.mutation(api.takeoffs.rooms.save, {
      roomId: page.rooms[0]?._id as Id<"rooms">,
      ...bathroom,
      height: 3,
    });
    expect(await quantityOf(firm, estimateId, wallsId)).toBe(19.96);
  });
});
