import { normalizeUnit } from "../lib/text";

// Stores price what they sell (a 25 kg bag, a 280 ml cartridge) while norms
// count kilograms and litres. These read the amount from the product's title.

// What one of each unit a title names is worth in the unit a material is
// counted in. "ml" is millilitres next to litres and metres next to metres.
const worth: Record<string, Record<string, number>> = {
  kg: { kg: 1, g: 0.001, t: 1000 },
  g: { g: 1, kg: 1000 },
  t: { t: 1, kg: 0.001 },
  l: { l: 1, ml: 0.001 },
  mc: { mc: 1 },
  mp: { mp: 1 },
  m: { m: 1, ml: 1 },
  buc: { buc: 1 },
};

// Units counted per item: what the store sells is one of them.
const perItem = new Set(["buc", "set", "sac", "rola", "pereche"]);

const amountPattern =
  /(\d+(?:[.,]\d+)?)\s*(kg|gr|g|tone|tona|t|litri|litru|l|ml|mp|m2|mc|m3|m|buc|bucati|bucata)(?![a-z0-9])/g;

const titleUnits: Record<string, string> = {
  gr: "g",
  tone: "t",
  tona: "t",
  litri: "l",
  litru: "l",
  m2: "mp",
  m3: "mc",
  bucati: "buc",
  bucata: "buc",
};

/**
 * How many units of a material counted in `unit` one item sold under `title`
 * holds: "Adeziv flexibil 25 kg" holds 25 kg, "Silicon sanitar 280 ml" 0.28 l.
 * An item counted per piece holds 1 unless the title says how many. Null when
 * the title names no amount in a unit that converts.
 */
export function unitsPerSale(title: string, unit: string): number | null {
  const target = normalizeUnit(unit);
  const text = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/³/g, "3");
  const rates = worth[target];
  if (rates) {
    for (const match of text.matchAll(amountPattern)) {
      const amount = Number((match[1] ?? "").replace(",", "."));
      const named = match[2] ?? "";
      const rate = rates[titleUnits[named] ?? named];
      if (amount > 0 && rate !== undefined) {
        return Number((amount * rate).toPrecision(12));
      }
    }
  }
  return perItem.has(target) ? 1 : null;
}
