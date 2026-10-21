// Numbers and dates as the forms print them: 39.916,16 lei and 21.10.2026.
// Written out rather than left to Intl, so a document reads the same in every
// browser and in tests.

/** Rounds halves away from zero, ignoring float noise, like the recap does. */
function round(value: number, decimals: number): number {
  const scaled = Number((Math.abs(value) * 10 ** decimals).toPrecision(15));
  const rounded = (Math.sign(value) * Math.round(scaled)) / 10 ** decimals;
  return rounded === 0 ? 0 : rounded;
}

/**
 * A number with a dot between thousands and a decimal comma, rounded to at
 * most `max` decimals and padded to at least `min`: 1.615,00 or 0,035.
 */
export function formatNumber(value: number, min: number, max = min): string {
  const rounded = round(value, max);
  const [whole = "0", fraction = ""] = Math.abs(rounded)
    .toFixed(max)
    .split(".");
  let decimals = fraction;
  while (decimals.length > min && decimals.endsWith("0")) {
    decimals = decimals.slice(0, -1);
  }
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = rounded < 0 ? "-" : "";
  return decimals ? `${sign}${grouped},${decimals}` : `${sign}${grouped}`;
}

/** Lei, always with two decimals: 39.916,16. */
export function formatMoney(value: number): string {
  return formatNumber(value, 2);
}

/** A quantity of work: 42,50, or 12,345 when it has three decimals. */
export function formatQuantity(value: number): string {
  return formatNumber(value, 2, 3);
}

/** A consumption per unit of work: 4,50 or 0,035. */
export function formatConsumption(value: number): string {
  return formatNumber(value, 2, 4);
}

/** A rate glued to its sign: 21%, 2,25%. */
export function formatPercent(value: number): string {
  return `${formatNumber(value, 0, 2)}%`;
}

/** A calendar date stored as YYYY-MM-DD, as forms write it: 21.10.2026. */
export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

/** A Deviz's number as the app writes it: DVZ-0142, DVZ-0142-R2. */
export function estimateCode(number: number, revision = 1): string {
  const code = `DVZ-${String(number).padStart(4, "0")}`;
  return revision > 1 ? `${code}-R${revision}` : code;
}

/**
 * A unit as forms print it. Units are stored in their canonical spelling
 * (convex/lib/text.ts), which writes "ora" without its diacritic.
 */
export function formatUnit(unit: string): string {
  return unit === "ora" ? "oră" : unit;
}
