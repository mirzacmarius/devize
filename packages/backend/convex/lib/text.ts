/**
 * Lower case, without diacritics or punctuation, with single spaces: the form
 * names are matched and searched in, so "Faianță" and "faianta" are the same.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

// Units as Romanian norms write them, by the canonical spelling Devize stores.
const unitAliases: Record<string, string[]> = {
  mp: ["mp", "m2", "m²", "metru patrat", "metri patrati"],
  mc: ["mc", "m3", "m³", "metru cub", "metri cubi"],
  m: ["m", "ml", "m l", "metru", "metri", "metru liniar", "metri liniari"],
  km: ["km"],
  kg: ["kg", "kilogram", "kilograme"],
  t: ["t", "to", "tona", "tone"],
  l: ["l", "litru", "litri"],
  buc: ["buc", "bucata", "bucati"],
  set: ["set", "seturi"],
  ora: ["ora", "ore", "h"],
  zi: ["zi", "zile"],
  "%": ["%", "procent"],
};

function unitKey(value: string): string {
  return normalizeText(value.replace(/²/g, "2").replace(/³/g, "3"));
}

const unitByAlias = new Map(
  Object.entries(unitAliases).flatMap(([unit, aliases]) =>
    aliases.map((alias) => [unitKey(alias), unit] as const),
  ),
);

/**
 * The canonical spelling of a unit of measure ("m2" and "mp." are both "mp").
 * Units it does not know come back normalized, so they still compare equal.
 */
export function normalizeUnit(value: string): string {
  const key = unitKey(value);
  return unitByAlias.get(key) ?? key;
}

/** A consumption written as a percentage of the norm's materials, such as "Material mărunt 3 %". */
export function isPercentUnit(unit: string): boolean {
  return normalizeUnit(unit) === "%";
}

/** Hours of work, the unit labour is counted in for the summary. */
export function isHourUnit(unit: string): boolean {
  return normalizeUnit(unit) === "ora";
}
