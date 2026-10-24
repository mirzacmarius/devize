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
  g: ["g", "gr", "gram", "grame"],
  t: ["t", "to", "tona", "tone"],
  tkm: ["tkm", "t km"],
  l: ["l", "litru", "litri"],
  buc: ["buc", "bucata", "bucati"],
  set: ["set", "seturi"],
  sac: ["sac", "saci"],
  rola: ["rola", "role"],
  pereche: ["pereche", "perechi"],
  ora: ["ora", "ore", "h", "om ora", "om ore"],
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
 * A count in front stays ("100 m²" is "100 mp", "1 buc" is "buc"). Units it
 * does not know come back normalized, so they still compare equal.
 */
export function normalizeUnit(value: string): string {
  const counted = /^\s*(\d+(?:[.,]\d+)?)\s*([^\d\s.,].*)$/.exec(value);
  if (counted?.[1] && counted[2]) {
    const count = Number(counted[1].replace(",", "."));
    const unit = normalizeUnit(counted[2]);
    return count === 1 ? unit : `${count} ${unit}`;
  }
  const key = unitKey(value);
  return unitByAlias.get(key) ?? key;
}

/** Whether the unit is one Devize knows, with or without a count in front. */
export function isKnownUnit(value: string): boolean {
  return unitByAlias.has(normalizeUnit(value).replace(/^[\d.]+ /, ""));
}

/**
 * A norm code the catalog takes, from one a model or a person wrote:
 * capitals, digits, dots and dashes, at most 20 characters, or `fallback`
 * when nothing is left.
 */
export function cleanNormCode(value: string, fallback: string): string {
  const code = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^A-Z0-9.-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 20);
  return code || fallback;
}

/** A consumption written as a percentage of the norm's materials, such as "Material mărunt 3 %". */
export function isPercentUnit(unit: string): boolean {
  return normalizeUnit(unit) === "%";
}

/** Hours of work, the unit labour is counted in for the summary. */
export function isHourUnit(unit: string): boolean {
  return normalizeUnit(unit) === "ora";
}
