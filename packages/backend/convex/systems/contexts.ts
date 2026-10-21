import type { Infer } from "convex/values";
import { normalizeText } from "../lib/text";
import type { workContext } from "./validators";

// Where each Articol of a Deviz is done, read from the words around it: its
// own title and notes, then the names of its Capitol and Obiect, then the
// Deviz's title, and, for underfloor heating, the other Articole of its
// Capitol (the heating is a work of its own, next to the floor it heats).
// The nearest words win, and each context keeps where it was read, so a
// warning can say why it applies. No database here (docs/adr/0028).

export type WorkContext = Infer<typeof workContext>;

export const workContexts: readonly WorkContext[] = [
  "floor_heating",
  "outdoor",
  "wet",
  "facade",
];

const contextWords: Record<WorkContext, RegExp> = {
  floor_heating:
    /\bincalzir[a-z]*( electric[a-z]*)? (in|prin|de|sub) pardose[a-z]*|\bpardose[a-z]* (radiant|incalzit)[a-z]*|\b(covoras[a-z]*|cablu[a-z]*|foli[ae]) (electric[a-z]* )?(de incalzire|incalzitoar[a-z]*)/,
  outdoor:
    /\b(exterio[a-z]*|teras[a-z]*|balcon[a-z]*|fatad[a-z]*|curte[a-z]*|alee|alei|aleea|trotuar[a-z]*|gradin[a-z]*|piscin[a-z]*|soclu[a-z]*|anvelop[a-z]*|termosistem[a-z]*)\b/,
  wet: /\b(baie|bai|baia|baii|dus|dusul|dusuri|cad[aei]|grup[a-z]* sanitar[a-z]*|wc|toalet[a-z]*|spalatori[a-z]*|saun[a-z]*|piscin[a-z]*|zon[ae] umed[a-z]*)\b/,
  facade: /\b(fatad[a-z]*|anvelop[a-z]*|termosistem[a-z]*|etics)\b/,
};

// Words that place a work indoors: they also rule out an outdoor context
// read further out, such as a Capitol "Finisaje interioare" in a Deviz
// "Casă și fațadă".
const indoorWords = /\binterio[a-z]*\b/;
const noHeatingWords = /\bfara incalzir[a-z]*\b/;

// Rooms and whole dwellings. A Capitol or a Deviz named after a context and
// another place ("Apartament: baie și living") tells nothing of each Articol.
const placeWords =
  /\b(bucatari[a-z]*|living|sufragerie|dormito[a-z]*|hol|holul|camer[a-z]*|birou[a-z]*|apartament[a-z]*|interio[a-z]*|mansard[a-z]*|pod|podul|podului)\b/;

const floorWords =
  /\b(pardose[a-z]*|sap[ae]|pavaj[a-z]*|pavele|dusumea|terasa circulabila)\b/;
const wallWords = /\b(pere(te|ti|tii|tilor)|placaj pe pereti|tavan[a-z]*)\b/;
const skirtingWords = /\bplint[a-z]*\b/;

/** Where a context was read. */
export type ContextReason =
  | { from: "item" }
  | { from: "section"; name: string }
  | { from: "estimate"; title: string }
  | { from: "sibling"; title: string };

export type ItemContexts = {
  // A floor or a wall, when the Articol says; floors are what underfloor
  // heating concerns.
  surface: "floor" | "wall" | null;
  contexts: Partial<Record<WorkContext, ContextReason>>;
};

export type ContextInput = {
  estimateTitle: string;
  sections: readonly { _id: string; name: string; parentId?: string }[];
  items: readonly {
    _id: string;
    sectionId?: string;
    title: string;
    notes?: string;
    // The category of the Articol's norm, such as "Pardoseli".
    category?: string;
  }[];
};

/** The contexts some words name. A facade is also outdoors. */
export function contextsIn(text: string): Set<WorkContext> {
  const normalized = normalizeText(text);
  const found = new Set<WorkContext>();
  for (const context of workContexts) {
    if (contextWords[context].test(normalized)) {
      found.add(context);
    }
  }
  if (found.has("facade")) {
    found.add("outdoor");
  }
  if (noHeatingWords.test(normalized)) {
    found.delete("floor_heating");
  }
  return found;
}

/**
 * What one level of words says: the contexts it names and those it rules out
 * for the levels further out. Only an Articol's own words may name a context
 * next to other places; a Capitol or a Deviz that does is left unread.
 */
function readLevel(
  text: string,
  own: boolean,
): { found: Set<WorkContext>; ruledOut: Set<WorkContext> } {
  const normalized = normalizeText(text);
  const found = contextsIn(normalized);
  const ruledOut = new Set<WorkContext>();
  if (noHeatingWords.test(normalized)) {
    ruledOut.add("floor_heating");
  }
  if (indoorWords.test(normalized) && !found.has("outdoor")) {
    ruledOut.add("outdoor");
    ruledOut.add("facade");
  }
  const places = [
    found.has("wet"),
    found.has("outdoor"),
    placeWords.test(normalized),
  ].filter(Boolean).length;
  if (!own && places > 1) {
    for (const context of ["wet", "outdoor", "facade"] as const) {
      found.delete(context);
      ruledOut.add(context);
    }
  }
  return { found, ruledOut };
}

/** Whether an Articol is a floor or a wall, from its norm and its words. */
export function surfaceOf(item: {
  title: string;
  category?: string;
}): "floor" | "wall" | null {
  const text = normalizeText(item.title);
  if (skirtingWords.test(text)) {
    return "wall";
  }
  const category = normalizeText(item.category ?? "");
  if (floorWords.test(text) || category === "pardoseli") {
    return "floor";
  }
  if (
    wallWords.test(text) ||
    category === "placaje" ||
    category.startsWith("zugraveli")
  ) {
    return "wall";
  }
  return null;
}

/** Each Articol's surface and contexts, by its id. */
export function contextsOf(input: ContextInput): Map<string, ItemContexts> {
  const sections = new Map(input.sections.map((s) => [s._id, s]));
  const estimate = readLevel(input.estimateTitle, false);
  // Underfloor heating read from an Articol of its own, by Capitol; a Deviz
  // without Capitole is one group.
  const heatingBySection = new Map<string, string>();
  for (const item of input.items) {
    if (contextsIn(item.title).has("floor_heating")) {
      const group = item.sectionId ?? "";
      if (!heatingBySection.has(group)) {
        heatingBySection.set(group, item.title);
      }
    }
  }
  const result = new Map<string, ItemContexts>();
  for (const item of input.items) {
    const contexts: ItemContexts["contexts"] = {};
    const ruledOut = new Set<WorkContext>();
    const add = (
      level: ReturnType<typeof readLevel>,
      reason: ContextReason,
    ) => {
      for (const context of level.found) {
        if (!ruledOut.has(context)) {
          contexts[context] ??= reason;
        }
      }
      for (const context of level.ruledOut) {
        ruledOut.add(context);
      }
    };
    add(readLevel(`${item.title} ${item.notes ?? ""}`, true), { from: "item" });
    // The item's Capitol, then the Obiect around it.
    let section = item.sectionId ? sections.get(item.sectionId) : undefined;
    for (let depth = 0; section && depth < 5; depth++) {
      add(readLevel(section.name, false), {
        from: "section",
        name: section.name,
      });
      section = section.parentId ? sections.get(section.parentId) : undefined;
    }
    add(estimate, { from: "estimate", title: input.estimateTitle });
    const heating = heatingBySection.get(item.sectionId ?? "");
    if (heating && heating !== item.title && !ruledOut.has("floor_heating")) {
      contexts.floor_heating ??= { from: "sibling", title: heating };
    }
    result.set(item._id, { surface: surfaceOf(item), contexts });
  }
  return result;
}
