import { describe, expect, test } from "bun:test";
import {
  type BasketLine,
  deliveryFor,
  itemsFor,
  offerCost,
  planBasket,
  singleStore,
} from "./basketPlan";

// Made-up materials and prices.

describe("itemsFor", () => {
  test("buys whole items, allowing for rounding in the sums", () => {
    expect(itemsFor(26, 25)).toBe(2);
    expect(itemsFor(50, 25)).toBe(2);
    expect(itemsFor(0.1 + 0.2, 0.3)).toBe(1);
    expect(itemsFor(50.0000001, 25)).toBe(2);
    expect(itemsFor(3, 1)).toBe(3);
    expect(itemsFor(0.2, 25)).toBe(1);
    expect(itemsFor(0, 25)).toBe(0);
    expect(itemsFor(10, 0)).toBe(0);
  });

  test("prices the items in lei with VAT, rounded to bani", () => {
    expect(
      offerCost(108, { store: "dedeman", price: 45.9, unitsPerSale: 25 }),
    ).toBe(229.5);
  });
});

describe("deliveryFor", () => {
  test("charges the fee below the free-delivery threshold", () => {
    expect(deliveryFor(100, { fee: 50, freeFrom: 500 })).toBe(50);
    expect(deliveryFor(500, { fee: 50, freeFrom: 500 })).toBe(0);
    expect(deliveryFor(100, { fee: 50 })).toBe(50);
    expect(deliveryFor(0, { fee: 50 })).toBe(0);
    expect(deliveryFor(100, undefined)).toBe(0);
  });
});

const adhesive: BasketLine = {
  key: "adeziv",
  quantity: 100,
  offers: [
    { store: "dedeman", price: 40, unitsPerSale: 25 },
    { store: "hornbach", price: 50, unitsPerSale: 25 },
  ],
};
const tiles: BasketLine = {
  key: "faianta",
  quantity: 20,
  offers: [
    { store: "dedeman", price: 60, unitsPerSale: 1 },
    { store: "hornbach", price: 55, unitsPerSale: 1 },
  ],
};
const grout: BasketLine = {
  key: "chit",
  quantity: 10,
  offers: [{ store: "leroy_merlin", price: 30, unitsPerSale: 5 }],
};

describe("planBasket", () => {
  test("buys each material at its cheapest store when stores cost nothing", () => {
    const plan = planBasket([adhesive, tiles], {});
    expect(plan?.storeOf).toEqual({ adeziv: "dedeman", faianta: "hornbach" });
    expect(plan?.byStore).toEqual({
      dedeman: { goods: 160, delivery: 0, total: 160, lines: 1 },
      hornbach: { goods: 1100, delivery: 0, total: 1100, lines: 1 },
    });
    expect(plan?.total).toEqual({ goods: 1260, delivery: 0, total: 1260 });
  });

  test("keeps to one store when a second delivery costs more than it saves", () => {
    // Splitting saves 40 lei on the adhesive but pays a second delivery.
    const plan = planBasket([adhesive, tiles], {
      dedeman: { fee: 60 },
      hornbach: { fee: 60 },
    });
    expect(plan?.storeOf).toEqual({ adeziv: "hornbach", faianta: "hornbach" });
    expect(plan?.total).toEqual({ goods: 1300, delivery: 60, total: 1360 });
  });

  test("moves a material where it reaches free delivery", () => {
    // Only Dedeman sells the skirting. The adhesive is 40 lei cheaper there,
    // but buying it at Hornbach lifts Hornbach's order to 1300 lei, over its
    // free delivery from 1200, and saves the 80 lei fee.
    const skirting: BasketLine = {
      key: "plinta",
      quantity: 1,
      offers: [{ store: "dedeman", price: 20, unitsPerSale: 1 }],
    };
    const plan = planBasket([adhesive, tiles, skirting], {
      dedeman: { fee: 0 },
      hornbach: { fee: 80, freeFrom: 1200 },
    });
    expect(plan?.storeOf).toEqual({
      adeziv: "hornbach",
      faianta: "hornbach",
      plinta: "dedeman",
    });
    expect(plan?.total).toEqual({ goods: 1320, delivery: 0, total: 1320 });
  });

  test("uses the only store that sells a material", () => {
    const plan = planBasket([adhesive, tiles, grout], {
      dedeman: { fee: 50 },
      hornbach: { fee: 50 },
      leroy_merlin: { fee: 50 },
    });
    expect(plan?.storeOf.chit).toBe("leroy_merlin");
    expect(plan?.byStore.leroy_merlin).toEqual({
      goods: 60,
      delivery: 50,
      total: 110,
      lines: 1,
    });
  });

  test("leaves out the stores a person excluded and lines nobody sells", () => {
    const unsold: BasketLine = { key: "x", quantity: 3, offers: [] };
    const plan = planBasket([adhesive, tiles, unsold], {}, ["hornbach"]);
    expect(plan?.storeOf).toEqual({ adeziv: "dedeman", faianta: "dedeman" });
    expect(planBasket([unsold], {})).toBeNull();
    expect(planBasket([grout], {}, ["leroy_merlin"])).toBeNull();
  });

  test("prefers fewer stores when the totals are equal", () => {
    const same: BasketLine = {
      key: "same",
      quantity: 1,
      offers: [
        { store: "dedeman", price: 10, unitsPerSale: 1 },
        { store: "hornbach", price: 10, unitsPerSale: 1 },
      ],
    };
    const dedemanOnly: BasketLine = {
      key: "only",
      quantity: 1,
      offers: [{ store: "dedeman", price: 5, unitsPerSale: 1 }],
    };
    const plan = planBasket([same, dedemanOnly], {});
    expect(Object.keys(plan?.byStore ?? {})).toEqual(["dedeman"]);
  });
});

describe("singleStore", () => {
  test("totals what one store sells and counts the lines it covers", () => {
    expect(
      singleStore([adhesive, tiles, grout], "dedeman", {
        dedeman: { fee: 50, freeFrom: 2000 },
      }),
    ).toEqual({ goods: 1360, delivery: 50, total: 1410, lines: 2 });
  });
});
