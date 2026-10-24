// The categories of Devize's catalog of Norme de bază (docs/adr/0012), in the
// order works follow on a site. Each category owns a series of codes: a norm
// of "Zidărie" is DV-ZID- and a number, so the code says where its norm sits
// and the catalog is browsed by category over the codes alone.
//
// This module is small on purpose: the interface imports it for its category
// chips, while the norms themselves stay in catalog/base/.

export type BaseCategoryDefinition = {
  // The address and the filter use the key: /catalog?category=zid.
  key: string;
  // The code's middle part: DV-ZID-03.
  prefix: string;
  // The category as the norm stores it and the interface shows it.
  name: string;
};

export const baseCategories = [
  { key: "dem", prefix: "DEM", name: "Demolări și desfaceri" },
  { key: "ter", prefix: "TER", name: "Terasamente și lucrări exterioare" },
  { key: "bet", prefix: "BET", name: "Betoane și armături" },
  { key: "zid", prefix: "ZID", name: "Zidărie" },
  { key: "met", prefix: "MET", name: "Confecții metalice" },
  { key: "aco", prefix: "ACO", name: "Acoperișuri" },
  { key: "trm", prefix: "TRM", name: "Termoizolații" },
  { key: "hdr", prefix: "HDR", name: "Hidroizolații" },
  { key: "ten", prefix: "TEN", name: "Tencuieli și gleturi" },
  { key: "gip", prefix: "GIP", name: "Gips-carton" },
  { key: "prd", prefix: "PRD", name: "Pardoseli" },
  { key: "plc", prefix: "PLC", name: "Placaje" },
  { key: "zug", prefix: "ZUG", name: "Zugrăveli și vopsitorii" },
  { key: "tam", prefix: "TAM", name: "Tâmplărie" },
  { key: "san", prefix: "SAN", name: "Instalații sanitare" },
  { key: "inc", prefix: "INC", name: "Instalații termice" },
  { key: "gaz", prefix: "GAZ", name: "Instalații de gaze" },
  { key: "ven", prefix: "VEN", name: "Ventilație și climatizare" },
  { key: "ele", prefix: "ELE", name: "Instalații electrice" },
  { key: "csl", prefix: "CSL", name: "Curenți slabi" },
  { key: "rep", prefix: "REP", name: "Reparații și consolidări" },
  { key: "sch", prefix: "SCH", name: "Schele" },
  { key: "org", prefix: "ORG", name: "Organizare de șantier și diverse" },
] as const satisfies readonly BaseCategoryDefinition[];

export type BaseCategoryEntry = (typeof baseCategories)[number];
export type BaseCategory = BaseCategoryEntry["name"];
export type BaseCategoryKey = BaseCategoryEntry["key"];

/** The category with this key, such as "zid", or undefined. */
export function baseCategoryByKey(
  key: string | null | undefined,
): BaseCategoryEntry | undefined {
  return baseCategories.find((category) => category.key === key);
}

/** The category a norm's name belongs to, or undefined for a producer's. */
export function baseCategoryByName(
  name: string | null | undefined,
): BaseCategoryEntry | undefined {
  return baseCategories.find((category) => category.name === name);
}

/**
 * The range of codes a category owns, for the index on codes: from "DV-ZID-"
 * up to, not including, "DV-ZID." (the character after "-").
 */
export function codeRangeOf(category: BaseCategoryDefinition) {
  const start = `DV-${category.prefix}-`;
  return { start, end: `DV-${category.prefix}.` };
}
