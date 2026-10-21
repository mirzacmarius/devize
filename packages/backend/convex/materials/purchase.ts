import { cleanSizes } from "./packages";

// What to buy of a material: whole packages that cover what the Deviz needs,
// and what is left over once the work is done. No database here, so the
// arithmetic is easy to test (docs/adr/0027).

/** How many packages of one size to buy. */
export type PackageCount = { size: number; count: number };

export type Mix = {
  // Largest size first; sizes not bought are left out.
  counts: PackageCount[];
  // In the material's unit.
  bought: number;
  packages: number;
};

// Bigger packages cost less per unit: a 15 l bucket of paint costs about 1,5
// times a 5 l one, not 3 times. A package of size s is taken to cost s^0.85,
// enough to choose between mixes without knowing their prices.
const SIZE_EXPONENT = 0.85;

// Rounding in the sums must not buy one package more: 50,0000001 kg is two
// 25 kg bags.
const TOLERANCE = 1e-6;

const empty: Mix = { counts: [], bought: 0, packages: 0 };

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * The mix of package sizes that covers `need` for the least money: 22 l of
 * paint is a 15 l and an 8,5 l bucket rather than two of 15 l. With one size
 * it is just enough whole packages. At equal cost, the mix with less left
 * over wins, then the one with fewer packages.
 */
export function bestMix(need: number, sizes: readonly number[]): Mix {
  const usable = cleanSizes(sizes);
  const [largest, ...smaller] = usable;
  if (!(need > 0) || largest === undefined) {
    return empty;
  }
  // More of a smaller size than fills a largest package is never cheaper,
  // so each smaller size is tried from none up to that many.
  const limits = smaller.map((size) => Math.ceil(largest / size));
  const counts = smaller.map(() => 0);
  let best = {
    counts: [] as number[],
    cost: Number.POSITIVE_INFINITY,
    bought: 0,
  };
  for (;;) {
    const partial = smaller.reduce(
      (sum, size, index) => sum + size * (counts[index] ?? 0),
      0,
    );
    const rest = need - partial;
    const large =
      rest <= TOLERANCE * largest ? 0 : Math.ceil(rest / largest - TOLERANCE);
    const all = [large, ...counts];
    const bought = partial + large * largest;
    const cost = all.reduce(
      (sum, count, index) =>
        sum + count * (usable[index] ?? 0) ** SIZE_EXPONENT,
      0,
    );
    if (
      cost < best.cost - 1e-9 ||
      (Math.abs(cost - best.cost) <= 1e-9 &&
        (bought < best.bought - 1e-9 ||
          (Math.abs(bought - best.bought) <= 1e-9 &&
            sumOf(all) < sumOf(best.counts))))
    ) {
      best = { counts: all, cost, bought };
    }
    // The next mix of smaller sizes, like an odometer.
    let index = 0;
    while (
      index < counts.length &&
      (counts[index] ?? 0) >= (limits[index] ?? 0)
    ) {
      counts[index] = 0;
      index++;
    }
    if (index === counts.length) {
      break;
    }
    counts[index] = (counts[index] ?? 0) + 1;
  }
  const mix = usable
    .map((size, index) => ({ size, count: best.counts[index] ?? 0 }))
    .filter((entry) => entry.count > 0);
  return {
    counts: mix,
    bought: round4(best.bought),
    packages: sumOf(mix.map((entry) => entry.count)),
  };
}

function sumOf(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export type Purchase = Mix & {
  // In the material's unit: what the Deviz needs, and what is left over.
  need: number;
  leftover: number;
  // The leftover in packages of the smallest size bought: 0,5 of a bag.
  leftoverShare: number;
};

/** What to buy for `need` in packages of `sizes`. */
export function purchaseOf(need: number, sizes: readonly number[]): Purchase {
  const mix = bestMix(need, sizes);
  const leftover = Math.max(0, round4(mix.bought - need));
  const smallest = Math.min(...mix.counts.map((entry) => entry.size));
  return {
    ...mix,
    need: round4(need),
    leftover,
    leftoverShare:
      mix.counts.length > 0 && smallest > 0
        ? Math.round((leftover / smallest) * 100) / 100
        : 0,
  };
}

/**
 * Buying for the whole Deviz rather than for each Articol on its own: how
 * many packages and how much of the material that saves. Three bathrooms
 * needing 11 kg of grout each take three 5 kg bags each, nine in all, but
 * seven bags together.
 */
export function poolingSaves(
  uses: readonly number[],
  sizes: readonly number[],
): { packages: number; quantity: number } {
  const together = bestMix(sumOf(uses), sizes);
  let packages = 0;
  let bought = 0;
  for (const use of uses) {
    const alone = bestMix(use, sizes);
    packages += alone.packages;
    bought += alone.bought;
  }
  return {
    packages: Math.max(0, packages - together.packages),
    quantity: Math.max(0, round4(bought - together.bought)),
  };
}
