import { normalizeText, normalizeUnit } from "../lib/text";
import { thicknessOf } from "../materials/packages";
import type { ContextReason, ItemContexts, WorkContext } from "./contexts";

// Combinații greșite: materials that don't suit where an Articol is done,
// such as a tile adhesive that isn't deformable on a heated floor. Devize's
// own rules, from current practice and the standards the materials are
// classed by (SR EN 12004 for tile adhesives, SR EN 13888 for grouts); each
// says why in one sentence and, when there is one, what to use instead. The
// replacements are Devize's generic materials, with no brand, priced like
// the Norme de bază until a firm sets its own price (docs/adr/0028).

export type Severity = "error" | "warning";

/** A Devize material that replaces the one a rule found. */
export type MaterialFix = {
  name: string;
  unit: string;
  referencePrice: number;
};

export type RuleFix =
  | { kind: "material"; material: MaterialFix }
  // A Normă de bază to switch the Articol to, by its code.
  | { kind: "norm"; code: string };

export type CheckResource = {
  key: string;
  kind: string;
  name: string;
  unit: string;
};

export type CheckItem = {
  _id: string;
  sectionId?: string;
  title: string;
  notes?: string;
  resources: readonly CheckResource[];
};

type Match = {
  item: CheckItem;
  // The other Articole of its Capitol, or of the Deviz when it has none.
  siblings: readonly CheckItem[];
  // The material's name, normalized.
  name: string;
};

type Rule = {
  id: string;
  severity: Severity;
  context?: WorkContext;
  surface?: "floor" | "wall";
  // The material the rule is about, by its normalized name.
  material: RegExp;
  // Names of that material that are fine.
  unless?: RegExp;
  // Anything else the rule needs of the Articol or its Capitol.
  when?: (match: Match) => boolean;
  // One finding per Articol, for a rule about a whole layer.
  oncePerItem?: boolean;
  fix?: RuleFix | ((material: string) => RuleFix | undefined);
  // One short sentence, the reason for the AI that checks Devize for
  // omissions (the interface has its own words for each rule).
  summary: string;
};

const deformableAdhesive: MaterialFix = {
  name: "Adeziv deformabil C2TE S1",
  unit: "kg",
  referencePrice: 2.4,
};

const frostProofTiles: MaterialFix = {
  name: "Gresie porțelanată rezistentă la îngheț",
  unit: "mp",
  referencePrice: 65,
};

const adhesiveWord = /\badeziv[a-z]*\b/;
// Adhesives for other materials than tiles.
const otherAdhesive =
  /\b(polistiren|eps|xps|bca|celular|gips|carton|parchet|tapet[a-z]*|vata|termo[a-z]*|lemn|pvc|mochet[a-z]*|linoleum|membran[a-z]*|bitum[a-z]*)\b/;
const tileAdhesiveWords =
  /\bc[12][a-z0-9]*\b|\b(gresie|faianta|ceramic[a-z]*|placi|placaj[a-z]*|mozaic|piatra|portelanat[a-z]*)\b/;
const tileWords =
  /\b(gresie|faianta|mozaic|clinker|klinker|ceramic[a-z]*|travertin|marmura|granit)\b/;
const deformable = /\bs[12]\b|\bc[12][a-z]*s[12]\b/;
const classC1 = /\bc1[a-z0-9]*\b/;
const insulationWords = /\b(polistiren|eps|xps|vata)\b/;
const woolWords = /\bvata\b/;
const roofWords =
  /\b(pod|podului|mansard[a-z]*|planseu[a-z]*|capriori|acoperis[a-z]*)\b/;

function namesOf(item: CheckItem): string[] {
  return item.resources
    .filter((resource) => resource.kind === "material")
    .map((resource) => normalizeText(resource.name));
}

function hasTiles(item: CheckItem): boolean {
  return namesOf(item).some((name) => tileWords.test(name));
}

/** A tile adhesive, by its name or by the tiles it lays. */
function isTileAdhesive({ item, name }: Match): boolean {
  return (
    adhesiveWord.test(name) &&
    !otherAdhesive.test(name) &&
    (tileAdhesiveWords.test(name) || hasTiles(item))
  );
}

/**
 * The longest side of the tiles an Articol lays, in centimetres, read from
 * its title or its materials ("60 × 120", "600x600 mm").
 */
export function tileSide(texts: readonly string[]): number | null {
  let longest: number | null = null;
  for (const text of texts) {
    for (const match of text.matchAll(
      /(\d{2,4})\s*[x×*]\s*(\d{2,4})(\s*mm)?/gi,
    )) {
      const side = Math.max(Number(match[1]), Number(match[2]));
      const centimetres = match[3] || side > 300 ? side / 10 : side;
      longest = Math.max(longest ?? 0, centimetres);
    }
  }
  return longest;
}

const rules = [
  {
    id: "heated_floor_adhesive",
    severity: "error",
    context: "floor_heating",
    surface: "floor",
    material: adhesiveWord,
    unless: deformable,
    when: isTileAdhesive,
    fix: { kind: "material", material: deformableAdhesive },
    summary:
      "adezivul nu e deformabil (S1), iar pe încălzirea în pardoseală plăcile se pot desprinde",
  },
  {
    id: "heated_floor_grout",
    severity: "warning",
    context: "floor_heating",
    surface: "floor",
    material: /\b(chit|mortar)\b.*\brost[a-z]*\b/,
    unless: /\b(flexibil[a-z]*|elastic[a-z]*|cg2[a-z0-9]*|epoxi[a-z]*|s1)\b/,
    fix: {
      kind: "material",
      material: {
        name: "Chit de rosturi flexibil CG2WA",
        unit: "kg",
        referencePrice: 8,
      },
    },
    summary:
      "pe încălzirea în pardoseală rosturile se fisurează dacă chitul nu e flexibil",
  },
  {
    id: "heated_floor_underlay",
    severity: "warning",
    context: "floor_heating",
    surface: "floor",
    material: /\b(folie de spuma|spuma|subparchet|underlay|pluta|xps)\b/,
    unless: /\b(incalzir[a-z]*|radiant[a-z]*)\b/,
    when: ({ item }) =>
      namesOf(item).some((name) =>
        /^(parchet|laminat|pardoseala (vinilica|laminat[a-z]*))\b|\b(spc|lvt)\b/.test(
          name,
        ),
      ),
    fix: {
      kind: "material",
      material: {
        name: "Folie suport pentru parchet, pentru încălzire în pardoseală",
        unit: "mp",
        referencePrice: 6,
      },
    },
    summary:
      "folia de sub parchet izolează termic, iar peste încălzirea în pardoseală trebuie una cu rezistență termică mică",
  },
  {
    id: "heated_floor_solid_wood",
    severity: "warning",
    context: "floor_heating",
    surface: "floor",
    material: /\b(parchet masiv|dusumea|scandur[a-z]*)\b/,
    unless: /\bincalzir[a-z]*\b/,
    fix: {
      kind: "material",
      material: {
        name: "Parchet stratificat, pentru încălzire în pardoseală",
        unit: "mp",
        referencePrice: 120,
      },
    },
    summary:
      "lemnul masiv crapă și se deformează pe încălzirea în pardoseală; se pune parchet stratificat",
  },
  {
    id: "outdoor_wall_tiles",
    severity: "error",
    context: "outdoor",
    material: /^(placi |placa )?(de |din )?faianta\b/,
    fix: { kind: "material", material: frostProofTiles },
    summary:
      "faianța e poroasă și crapă la îngheț; afară se pune gresie porțelanată",
  },
  {
    id: "floor_wall_tiles",
    severity: "error",
    surface: "floor",
    material: /^(placi |placa )?(de |din )?faianta\b/,
    fix: {
      kind: "material",
      material: { name: "Gresie porțelanată", unit: "mp", referencePrice: 55 },
    },
    summary: "faianța e pentru pereți; pe pardoseală se tocește și alunecă",
  },
  {
    id: "outdoor_tiles_frost",
    severity: "warning",
    context: "outdoor",
    material: /^(placi |placa )?(de |din )?gresie\b/,
    unless:
      /\b(portelanat[a-z]*|inghet|antiinghet|clinker|klinker|exterio[a-z]*|teras[a-z]*)\b/,
    fix: { kind: "material", material: frostProofTiles },
    summary:
      "afară gresia trebuie să fie rezistentă la îngheț (porțelanată, cu absorbție de apă mică)",
  },
  {
    id: "outdoor_adhesive_c1",
    severity: "error",
    context: "outdoor",
    material: classC1,
    when: isTileAdhesive,
    fix: { kind: "material", material: deformableAdhesive },
    summary:
      "adezivul C1 nu e pentru exterior; afară trebuie adeziv îmbunătățit C2, deformabil S1",
  },
  {
    id: "outdoor_adhesive_deformable",
    severity: "warning",
    context: "outdoor",
    material: adhesiveWord,
    unless: deformable,
    when: isTileAdhesive,
    fix: { kind: "material", material: deformableAdhesive },
    summary:
      "afară plăcile se dilată la soare și la ger, iar adezivul trebuie să fie deformabil (S1)",
  },
  {
    id: "large_tiles_c1",
    severity: "warning",
    material: classC1,
    when: (match) =>
      isTileAdhesive(match) &&
      (tileSide([
        match.item.title,
        ...match.item.resources.map((resource) => resource.name),
      ]) ?? 0) >= 60,
    fix: {
      kind: "material",
      material: {
        name: "Adeziv flexibil C2TE",
        unit: "kg",
        referencePrice: 1.6,
      },
    },
    summary:
      "plăcile de la 60 cm în sus cer adeziv îmbunătățit C2, întins pe ambele fețe",
  },
  {
    id: "outdoor_interior_paint",
    severity: "error",
    context: "outdoor",
    material: /^vopse[a-z]*\b.*\b(lavabil[a-z]*|interio[a-z]*)\b/,
    unless: /\b(exterio[a-z]*|fatad[a-z]*)\b/,
    fix: {
      kind: "material",
      material: {
        name: "Vopsea lavabilă pentru fațade",
        unit: "l",
        referencePrice: 18,
      },
    },
    summary:
      "vopseaua de interior nu rezistă la ploaie și la UV; afară trebuie vopsea pentru fațade",
  },
  {
    id: "wet_interior_paint",
    severity: "warning",
    context: "wet",
    material: /^vopse[a-z]*\b.*\blavabil[a-z]*\b/,
    unless:
      /\b(bai|baie|bucatari[a-z]*|umed[a-z]*|umiditat[a-z]*|mucegai|antimucegai|fungicid[a-z]*|antibacterian[a-z]*|latex|exterio[a-z]*|fatad[a-z]*)\b/,
    fix: {
      kind: "material",
      material: {
        name: "Vopsea lavabilă pentru băi și bucătării, anti-mucegai",
        unit: "l",
        referencePrice: 20,
      },
    },
    summary:
      "în baie vopseaua obișnuită face mucegai; trebuie vopsea pentru încăperi umede, cu fungicid",
  },
  {
    id: "outdoor_gypsum_plaster",
    severity: "error",
    context: "outdoor",
    material: /^tencuial[a-z]*\b.*\b(ipsos|gips)\b/,
    unless: /\bcarton\b/,
    oncePerItem: true,
    fix: { kind: "norm", code: "DV-TEN-03" },
    summary:
      "tencuiala de ipsos nu rezistă la apă; afară se face tencuială pe bază de ciment și var",
  },
  {
    id: "outdoor_gypsum_skim",
    severity: "error",
    context: "outdoor",
    material: /^glet[a-z]*\b.*\b(ipsos|gips)\b/,
    fix: {
      kind: "material",
      material: {
        name: "Glet pe bază de ciment pentru exterior",
        unit: "kg",
        referencePrice: 2.2,
      },
    },
    summary:
      "gletul de ipsos nu rezistă la apă; afară trebuie glet pe bază de ciment",
  },
  {
    id: "wet_gypsum_plaster",
    severity: "warning",
    context: "wet",
    material: /^tencuial[a-z]*\b.*\b(ipsos|gips)\b/,
    unless: /\bcarton\b/,
    oncePerItem: true,
    fix: { kind: "norm", code: "DV-TEN-02" },
    summary:
      "în băi și la dușuri tencuiala de ipsos se înmoaie la umezeală; se preferă cea pe bază de ciment și var",
  },
  {
    id: "outdoor_gypsum_board",
    severity: "error",
    context: "outdoor",
    material: /^(plac[a-z]* (de |din )?)?gips ?carton\b/,
    unless: /\b(exterio[a-z]*|ciment[a-z]*|fibrociment|aquapanel|aquaroc)\b/,
    oncePerItem: true,
    summary:
      "gips-cartonul nu se montează afară; acolo se folosesc plăci din ciment, cu profilele și șuruburile lor",
  },
  {
    id: "wet_gypsum_board",
    severity: "error",
    context: "wet",
    material: /^(plac[a-z]* (de |din )?)?gips ?carton\b/,
    unless:
      /\b(rezistent[a-z]* la umiditate|hidrofug[a-z]*|h1|h2|verde|verzi|impregnat[a-z]*|umed[a-z]*|ciment[a-z]*|aquapanel)\b/,
    fix: {
      kind: "material",
      material: {
        name: "Placă de gips-carton rezistentă la umiditate (H2), 12,5 mm",
        unit: "mp",
        referencePrice: 22,
      },
    },
    summary:
      "în baie gips-cartonul obișnuit absoarbe apa; trebuie plăci rezistente la umiditate (H2)",
  },
  {
    id: "wet_laminate",
    severity: "error",
    context: "wet",
    surface: "floor",
    material: /^(parchet|laminat|pardoseala laminat[a-z]*)\b/,
    unless:
      /\b(rezistent[a-z]* la apa|waterproof|impermeabil[a-z]*|aqua[a-z]*|hidro[a-z]*|spc|vinil[a-z]*|lvt)\b/,
    oncePerItem: true,
    fix: { kind: "norm", code: "DV-PRD-06" },
    summary:
      "parchetul se umflă la apă; în baie se pune gresie sau pardoseală vinilică SPC",
  },
  {
    id: "wet_silicone",
    severity: "warning",
    context: "wet",
    material: /^silicon\b/,
    unless: /\b(sanitar|antimucegai|anti mucegai|fungicid[a-z]*)\b/,
    fix: {
      kind: "material",
      material: {
        name: "Silicon sanitar, cartuș",
        unit: "buc",
        referencePrice: 20,
      },
    },
    summary:
      "în baie siliconul obișnuit face mucegai; trebuie silicon sanitar, cu fungicid",
  },
  {
    id: "mineral_wool_acrylic",
    severity: "warning",
    material: /^tencuial[a-z]*\b.*\bacrilic[a-z]*\b/,
    // The wool in the same Articol, or, for a render priced on its own, in
    // the Capitol.
    when: ({ item, siblings }) => {
      const own = namesOf(item);
      if (own.some((name) => woolWords.test(name))) {
        return true;
      }
      return (
        !own.some((name) => insulationWords.test(name)) &&
        siblings.some((sibling) =>
          namesOf(sibling).some((name) => woolWords.test(name)),
        )
      );
    },
    fix: {
      kind: "material",
      material: {
        name: "Tencuială decorativă siliconică, 1,5 mm",
        unit: "kg",
        referencePrice: 8,
      },
    },
    summary:
      "pe vată minerală tencuiala acrilică ține vaporii în izolație; se folosește tencuială siliconică sau silicatică",
  },
  {
    id: "mineral_wool_eps_adhesive",
    severity: "warning",
    material: /^adeziv[a-z]*\b.*\b(polistiren|eps)\b/,
    unless: /\b(vata|mineral[a-z]*|universal[a-z]*)\b/,
    when: ({ item }) => namesOf(item).some((name) => woolWords.test(name)),
    fix: {
      kind: "material",
      material: {
        name: "Adeziv pentru vată minerală, lipire și armare",
        unit: "kg",
        referencePrice: 1.6,
      },
    },
    summary:
      "adezivul pentru polistiren nu e pentru vată minerală; trebuie adeziv pentru vată",
  },
  {
    id: "facade_glass_wool",
    severity: "error",
    context: "facade",
    material: /^vata\b.*\bsticla\b/,
    unless: /\bventilat[a-z]*\b/,
    // Not the attic or the roof of a building whose facade is insulated.
    when: ({ item }) => !roofWords.test(normalizeText(item.title)),
    fix: (material) => {
      const thickness = thicknessOf(material);
      const centimetres = thickness ? Math.round(thickness * 100) : null;
      return {
        kind: "material",
        material: {
          name: `Vată minerală bazaltică pentru termosisteme${centimetres ? `, ${centimetres} cm` : ""}`,
          unit: "mp",
          referencePrice: centimetres ? Math.round(4.5 * centimetres) : 45,
        },
      };
    },
    summary:
      "vata de sticlă nu e pentru termosisteme; pe fațade se lipește vată bazaltică rigidă",
  },
  {
    id: "bitumen_under_tiles",
    severity: "warning",
    context: "wet",
    material: /\bbitum[a-z]*\b/,
    oncePerItem: true,
    when: ({ item, siblings }) =>
      !hasTiles(item) &&
      siblings.some(
        (sibling) =>
          hasTiles(sibling) || tileWords.test(normalizeText(sibling.title)),
      ),
    fix: { kind: "norm", code: "DV-HDR-03" },
    summary:
      "adezivul de plăci nu se lipește pe bitum; sub gresie și faianță hidroizolația se face cu mortar elastic",
  },
] as const satisfies readonly Rule[];

export type RuleId = (typeof rules)[number]["id"] | "system_unsuitable";

export const ruleIds: readonly RuleId[] = [
  ...rules.map((rule) => rule.id),
  "system_unsuitable",
];

export type RuleFinding = {
  ruleId: RuleId;
  severity: Severity;
  lineItemId: string;
  resourceKey: string;
  // The material's name, as on the Articol.
  material: string;
  context?: WorkContext;
  reason?: ContextReason;
  fix?: RuleFix;
  // Stays the same for the same Articol and material in a new revision of
  // the Deviz, so dismissing it lasts: the rule, the Articol's title and the
  // material's name.
  key: string;
  summary: string;
};

/** The key a finding is dismissed by. */
export function findingKey(
  ruleId: string,
  itemTitle: string,
  material: string,
): string {
  return `${ruleId}:${normalizeText(itemTitle)}:${normalizeText(material)}`;
}

/**
 * A context read from the Deviz's title or from another Articol is a guess:
 * what it finds is only worth checking.
 */
function severityFor(severity: Severity, reason?: ContextReason): Severity {
  return reason && (reason.from === "estimate" || reason.from === "sibling")
    ? "warning"
    : severity;
}

function fixFor(rule: Rule, resource: CheckResource): RuleFix | undefined {
  const fix =
    typeof rule.fix === "function" ? rule.fix(resource.name) : rule.fix;
  if (
    fix?.kind === "material" &&
    normalizeUnit(fix.material.unit) !== normalizeUnit(resource.unit)
  ) {
    // Another unit would need another consumption: the warning stays, the
    // swap doesn't.
    return undefined;
  }
  return fix;
}

/**
 * What a rule puts in place of a material, worked out again from the rule
 * itself, so a swap only ever writes Devize's own materials.
 */
export function fixOf(
  ruleId: string,
  resource: CheckResource,
): RuleFix | undefined {
  const rule = (rules as readonly Rule[]).find((r) => r.id === ruleId);
  return rule ? fixFor(rule, resource) : undefined;
}

/** What the rules find in a Deviz's Articole, at most one per material. */
export function ruleFindings(
  items: readonly CheckItem[],
  contexts: ReadonlyMap<string, ItemContexts>,
): RuleFinding[] {
  const bySection = new Map<string, CheckItem[]>();
  for (const item of items) {
    const group = bySection.get(item.sectionId ?? "") ?? [];
    group.push(item);
    bySection.set(item.sectionId ?? "", group);
  }
  const findings: RuleFinding[] = [];
  for (const item of items) {
    const where = contexts.get(item._id);
    if (!where) {
      continue;
    }
    const siblings = (bySection.get(item.sectionId ?? "") ?? []).filter(
      (other) => other._id !== item._id,
    );
    const rulesDone = new Set<string>();
    for (const resource of item.resources) {
      if (resource.kind !== "material") {
        continue;
      }
      const name = normalizeText(resource.name);
      const found = (rules as readonly Rule[]).find((rule) => {
        const reason = rule.context ? where.contexts[rule.context] : undefined;
        return (
          !rulesDone.has(rule.id) &&
          (!rule.context || reason !== undefined) &&
          (!rule.surface || where.surface === rule.surface) &&
          rule.material.test(name) &&
          !rule.unless?.test(name) &&
          (!rule.when || rule.when({ item, siblings, name }))
        );
      });
      if (!found) {
        continue;
      }
      if (found.oncePerItem) {
        rulesDone.add(found.id);
      }
      const reason = found.context ? where.contexts[found.context] : undefined;
      findings.push({
        ruleId: found.id as RuleId,
        severity: severityFor(found.severity, reason),
        lineItemId: item._id,
        resourceKey: resource.key,
        material: resource.name,
        context: found.context,
        reason,
        fix: fixFor(found, resource),
        key: findingKey(found.id, item.title, resource.name),
        summary: found.summary,
      });
    }
  }
  return findings;
}
