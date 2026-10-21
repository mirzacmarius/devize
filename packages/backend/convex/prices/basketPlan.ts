import type { Store } from "./resolve";

// The Coș: where to buy a Deviz's materials for the least money. Each
// material is bought at one store, in whole items (26 kg of adhesive in 25 kg
// bags is two bags), and every store used costs its delivery, or the trip to
// it, unless the goods bought there reach its free-delivery threshold. No
// database here, so the page can plan again at once when a store is left out.

/** A store's product for a material. */
export type BasketOffer = {
  store: Store;
  // Lei with VAT for one item sold.
  price: number;
  // How many of the material's units one item holds.
  unitsPerSale: number;
};

export type BasketLine = {
  key: string;
  // How much the Deviz needs, in the material's unit.
  quantity: number;
  offers: BasketOffer[];
};

/** What using a store costs besides the goods: delivery, or the trip there. */
export type StoreFee = {
  // Lei with VAT.
  fee: number;
  // Goods worth at least this much, in lei with VAT, ship free.
  freeFrom?: number;
};

export type StoreFees = Partial<Record<Store, StoreFee>>;

/** Lei with VAT. */
export type BasketTotal = { goods: number; delivery: number; total: number };

export type BasketPlan = {
  // The store each material is bought at, by its key.
  storeOf: Record<string, Store>;
  byStore: Partial<Record<Store, BasketTotal & { lines: number }>>;
  total: BasketTotal;
};

/** Lei rounded to bani. */
function bani(lei: number): number {
  return Math.round(lei * 100) / 100;
}

/** Whole items to buy for a quantity, allowing for rounding in the sums. */
export function itemsFor(quantity: number, unitsPerSale: number): number {
  if (!(quantity > 0) || !(unitsPerSale > 0)) {
    return 0;
  }
  return Math.max(1, Math.ceil(quantity / unitsPerSale - 1e-6));
}

/** What a line costs at a store, in lei with VAT. */
export function offerCost(quantity: number, offer: BasketOffer): number {
  return bani(itemsFor(quantity, offer.unitsPerSale) * offer.price);
}

/** The delivery a store charges for goods worth `goods` lei. */
export function deliveryFor(goods: number, fee: StoreFee | undefined): number {
  if (!fee || goods <= 0) {
    return 0;
  }
  return fee.freeFrom !== undefined && goods >= fee.freeFrom ? 0 : fee.fee;
}

type Priced = { key: string; costs: Map<Store, number> };

function summarize(
  lines: Priced[],
  storeOf: Map<string, Store>,
  fees: StoreFees,
): BasketPlan {
  const byStore: BasketPlan["byStore"] = {};
  for (const line of lines) {
    const store = storeOf.get(line.key);
    const cost = store ? line.costs.get(store) : undefined;
    if (!store || cost === undefined) {
      continue;
    }
    const entry = byStore[store] ?? {
      goods: 0,
      delivery: 0,
      total: 0,
      lines: 0,
    };
    entry.goods = bani(entry.goods + cost);
    entry.lines++;
    byStore[store] = entry;
  }
  const total: BasketTotal = { goods: 0, delivery: 0, total: 0 };
  for (const [store, entry] of Object.entries(byStore) as [
    Store,
    BasketTotal,
  ][]) {
    entry.delivery = deliveryFor(entry.goods, fees[store]);
    entry.total = bani(entry.goods + entry.delivery);
    total.goods = bani(total.goods + entry.goods);
    total.delivery = bani(total.delivery + entry.delivery);
  }
  total.total = bani(total.goods + total.delivery);
  return { storeOf: Object.fromEntries(storeOf), byStore, total };
}

function storesUsed(plan: BasketPlan): number {
  return Object.keys(plan.byStore).length;
}

/** Cheaper, or as cheap with fewer stores to deal with. */
function isBetter(plan: BasketPlan, than: BasketPlan | null): boolean {
  if (!than) {
    return true;
  }
  const difference = plan.total.total - than.total.total;
  return (
    difference < -0.005 ||
    (Math.abs(difference) <= 0.005 && storesUsed(plan) < storesUsed(than))
  );
}

function totalOf(goods: Map<Store, number>, fees: StoreFees): number {
  let total = 0;
  for (const [store, amount] of goods) {
    total += amount + deliveryFor(amount, fees[store]);
  }
  return bani(total);
}

/**
 * Moves materials to a store whose goods fall short of its free delivery,
 * cheapest moves first, when crossing the threshold saves more than the
 * moves cost.
 */
function reachFreeDelivery(
  lines: Priced[],
  plan: BasketPlan,
  fees: StoreFees,
): BasketPlan {
  let best = plan;
  for (const store of Object.keys(plan.byStore) as Store[]) {
    const freeFrom = fees[store]?.freeFrom;
    const current = best.byStore[store];
    if (freeFrom === undefined || !current || current.delivery === 0) {
      continue;
    }
    const storeOf = new Map(Object.entries(best.storeOf));
    const goods = new Map<Store, number>();
    for (const [other, entry] of Object.entries(best.byStore)) {
      goods.set(other as Store, entry.goods);
    }
    const moves = lines
      .flatMap((line) => {
        const from = storeOf.get(line.key);
        const here = line.costs.get(store);
        const there = from ? line.costs.get(from) : undefined;
        return from &&
          from !== store &&
          here !== undefined &&
          there !== undefined
          ? [{ key: line.key, from, here, there }]
          : [];
      })
      .sort((a, b) => a.here - a.there - (b.here - b.there));
    let bestTotal = best.total.total;
    let bestMoves = 0;
    for (const [index, move] of moves.entries()) {
      const left = (goods.get(move.from) ?? 0) - move.there;
      if (left > 0.001) {
        goods.set(move.from, left);
      } else {
        goods.delete(move.from);
      }
      goods.set(store, (goods.get(store) ?? 0) + move.here);
      const total = totalOf(goods, fees);
      if (total < bestTotal - 0.005) {
        bestTotal = total;
        bestMoves = index + 1;
      }
      if ((goods.get(store) ?? 0) >= freeFrom) {
        break;
      }
    }
    if (bestMoves > 0) {
      for (const move of moves.slice(0, bestMoves)) {
        storeOf.set(move.key, store);
      }
      best = summarize(lines, storeOf, fees);
    }
  }
  return best;
}

/**
 * The cheapest way to buy every material some store sells, delivery
 * included: each set of stores is tried, every material goes to the cheapest
 * store in the set, then materials move where that reaches free delivery.
 * Lines no store sells are left out. Null when nothing has an offer.
 */
export function planBasket(
  lines: BasketLine[],
  fees: StoreFees,
  leaveOut: readonly Store[] = [],
): BasketPlan | null {
  const priced: Priced[] = [];
  for (const line of lines) {
    const costs = new Map<Store, number>();
    for (const offer of line.offers) {
      const cost = offerCost(line.quantity, offer);
      if (cost > 0 && !leaveOut.includes(offer.store)) {
        const known = costs.get(offer.store);
        costs.set(
          offer.store,
          known === undefined ? cost : Math.min(known, cost),
        );
      }
    }
    if (costs.size > 0) {
      priced.push({ key: line.key, costs });
    }
  }
  if (priced.length === 0) {
    return null;
  }
  const stores = [...new Set(priced.flatMap((line) => [...line.costs.keys()]))];
  let best: BasketPlan | null = null;
  for (let mask = 1; mask < 1 << stores.length; mask++) {
    const allowed = stores.filter((_, index) => mask & (1 << index));
    const storeOf = new Map<string, Store>();
    let complete = true;
    for (const line of priced) {
      let cheapest: Store | undefined;
      for (const store of allowed) {
        const cost = line.costs.get(store);
        if (
          cost !== undefined &&
          (cheapest === undefined || cost < (line.costs.get(cheapest) ?? 0))
        ) {
          cheapest = store;
        }
      }
      if (cheapest === undefined) {
        complete = false;
        break;
      }
      storeOf.set(line.key, cheapest);
    }
    if (!complete) {
      continue;
    }
    const plan = reachFreeDelivery(
      priced,
      summarize(priced, storeOf, fees),
      fees,
    );
    if (isBetter(plan, best)) {
      best = plan;
    }
  }
  return best;
}

/**
 * Buying everything a single store sells there: what it costs and how many
 * of the lines it covers.
 */
export function singleStore(
  lines: BasketLine[],
  store: Store,
  fees: StoreFees,
): BasketTotal & { lines: number } {
  let goods = 0;
  let covered = 0;
  for (const line of lines) {
    const offer = line.offers.find((candidate) => candidate.store === store);
    const cost = offer ? offerCost(line.quantity, offer) : 0;
    if (cost > 0) {
      goods = bani(goods + cost);
      covered++;
    }
  }
  const delivery = deliveryFor(goods, fees[store]);
  return { goods, delivery, total: bani(goods + delivery), lines: covered };
}
