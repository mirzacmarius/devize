import { normalizeText } from "../lib/text";
import { baseSystems } from "./baseSystems";
import type { ItemContexts, WorkContext } from "./contexts";
import { type CheckItem, findingKey, type RuleFinding } from "./rules";

// Restul sistemului: the works a Deviz lacks to complete the systems it
// started, Devize's own and the Producători's, and the producers' own word
// on where their systems don't belong. No database here (docs/adr/0028).

export type SystemItem = CheckItem & {
  code: string;
  // The norm's code when it is a Normă de bază.
  baseCode?: string;
  // The norm's first version, shared by all its versions.
  lineageId?: string;
  productIds: readonly string[];
};

/** A Producător's published system, as the check reads it. */
export type ProducerSystem = {
  _id: string;
  name: string;
  producer: string;
  normLineageIds: readonly string[];
  productIds: readonly string[];
  suitable: readonly WorkContext[];
  unsuitable: readonly WorkContext[];
};

export type SystemRef =
  | { kind: "base"; id: string; name: string }
  | { kind: "producer"; id: string; name: string; producer: string };

/** A norm to add, to complete a system some Articole started. */
export type RestSuggestion = {
  key: string;
  system: SystemRef;
  // The norm: a Normă de bază by its code, or a producer's by its lineage.
  baseCode?: string;
  lineageId?: string;
  // The Articole that started the system; the new one goes after the last.
  lineItemIds: string[];
};

function inContexts(
  where: ItemContexts | undefined,
  contexts: readonly WorkContext[] | undefined,
): boolean {
  return contexts?.some((context) => where?.contexts[context]) ?? false;
}

/** The Producători's systems an Articol belongs to. */
export function systemsOfItem(
  item: SystemItem,
  systems: readonly ProducerSystem[],
): ProducerSystem[] {
  return systems.filter(
    (system) =>
      (item.lineageId !== undefined &&
        system.normLineageIds.includes(item.lineageId)) ||
      item.productIds.some((id) => system.productIds.includes(id)),
  );
}

/**
 * What each system started in the Deviz still lacks. A part another Articol
 * already does, by its norm or by its title, isn't suggested again.
 */
export function restOfSystems(
  items: readonly SystemItem[],
  contexts: ReadonlyMap<string, ItemContexts>,
  systems: readonly ProducerSystem[],
): RestSuggestion[] {
  const titles = items.map((item) => normalizeText(item.title));
  const codes = new Set(items.flatMap((item) => [item.code, item.baseCode]));
  const lineages = new Set(items.map((item) => item.lineageId));
  // One suggestion per norm, however many systems lack it.
  const suggestions = new Map<string, RestSuggestion>();
  const suggest = (key: string, fields: Omit<RestSuggestion, "key">) => {
    const known = suggestions.get(key);
    if (known) {
      for (const id of fields.lineItemIds) {
        if (!known.lineItemIds.includes(id)) {
          known.lineItemIds.push(id);
        }
      }
      return;
    }
    suggestions.set(key, { key, ...fields });
  };

  for (const system of baseSystems) {
    const core = items.filter(
      (item) => item.baseCode && system.core.includes(item.baseCode),
    );
    for (const part of system.parts) {
      const starting = core.filter((item) => {
        const where = contexts.get(item._id);
        return (
          (!part.when || inContexts(where, part.when)) &&
          !inContexts(where, part.unless)
        );
      });
      if (
        starting.length === 0 ||
        codes.has(part.code) ||
        titles.some((title) => part.present.test(title))
      ) {
        continue;
      }
      suggest(`rest:base:${part.code}`, {
        system: { kind: "base", id: system.id, name: system.name },
        baseCode: part.code,
        lineItemIds: starting.map((item) => item._id),
      });
    }
  }

  for (const system of systems) {
    const starting = items.filter(
      (item) => systemsOfItem(item, [system]).length > 0,
    );
    if (starting.length === 0) {
      continue;
    }
    for (const lineageId of system.normLineageIds) {
      if (lineages.has(lineageId)) {
        continue;
      }
      suggest(`rest:norm:${lineageId}`, {
        system: {
          kind: "producer",
          id: system._id,
          name: system.name,
          producer: system.producer,
        },
        lineageId,
        lineItemIds: starting.map((item) => item._id),
      });
    }
  }
  return [...suggestions.values()];
}

/**
 * Where a Producător says its own system doesn't belong, such as a floor
 * system not meant for underfloor heating, found on the Articole using it.
 */
export function unsuitableFindings(
  items: readonly SystemItem[],
  contexts: ReadonlyMap<string, ItemContexts>,
  systems: readonly ProducerSystem[],
): (RuleFinding & { system: SystemRef })[] {
  const findings: (RuleFinding & { system: SystemRef })[] = [];
  for (const item of items) {
    const where = contexts.get(item._id);
    for (const system of systemsOfItem(item, systems)) {
      const context = system.unsuitable.find((c) => where?.contexts[c]);
      if (!context) {
        continue;
      }
      const reason = where?.contexts[context];
      findings.push({
        ruleId: "system_unsuitable",
        severity:
          reason?.from === "estimate" || reason?.from === "sibling"
            ? "warning"
            : "error",
        lineItemId: item._id,
        resourceKey: "",
        material: system.name,
        context,
        reason,
        key: findingKey("system_unsuitable", item.title, system.name),
        summary: `producătorul nu recomandă sistemul „${system.name}” aici`,
        system: {
          kind: "producer",
          id: system._id,
          name: system.name,
          producer: system.producer,
        },
      });
    }
  }
  return findings;
}

/**
 * The Producători's systems meant for a context, in an order no one pays
 * for: by producer, then by name.
 */
export function suitableSystems<T extends ProducerSystem>(
  systems: readonly T[],
  context: WorkContext,
): T[] {
  return systems
    .filter((system) => system.suitable.includes(context))
    .sort(
      (a, b) =>
        a.producer.localeCompare(b.producer, "ro") ||
        a.name.localeCompare(b.name, "ro"),
    );
}

/**
 * The length around the floors an Antemăsurătoare measured, for their
 * skirting: twice the length and width of each row, without door openings.
 * Null when a row isn't a floor measured in length and width.
 */
export function perimeterOf(
  rows: readonly {
    count: number;
    length?: number;
    width?: number;
    height?: number;
    deduct: boolean;
  }[],
): number | null {
  let total = 0;
  for (const row of rows) {
    if (row.deduct) {
      continue;
    }
    if (
      row.length === undefined ||
      row.width === undefined ||
      row.height !== undefined
    ) {
      return null;
    }
    total += row.count * 2 * (row.length + row.width);
  }
  return total > 0 ? Math.round(total * 100) / 100 : null;
}
