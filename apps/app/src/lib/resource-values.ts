import type { Doc } from "@devize/backend/convex/_generated/dataModel";

export type ResourceKind = Doc<"resources">["kind"];

export const resourceKinds: readonly ResourceKind[] = [
  "material",
  "labor",
  "equipment",
  "transport",
];

type Priced = {
  kind: ResourceKind;
  unit: string;
  quantity: number;
  // Lei per unit of the resource; a "%" resource has none.
  price?: number;
};

export const isPercent = (resource: { unit: string }) => resource.unit === "%";

/**
 * What each resource costs for one unit of work, in the order given. A "%"
 * resource is a share of the materials, or of its own kind for labour and
 * equipment, as estimates/recap.ts computes it. A resource without a price
 * costs nothing.
 */
export function resourceValues(resources: readonly Priced[]): number[] {
  const base = { material: 0, labor: 0, equipment: 0, transport: 0 };
  for (const resource of resources) {
    if (!isPercent(resource)) {
      base[resource.kind] += resource.quantity * (resource.price ?? 0);
    }
  }
  return resources.map((resource) => {
    if (!isPercent(resource)) {
      return resource.quantity * (resource.price ?? 0);
    }
    const of = resource.kind === "transport" ? "material" : resource.kind;
    return (base[of] * resource.quantity) / 100;
  });
}

/** One unit of work's cost by kind of resource, and in all. */
export function costByKind(resources: readonly Priced[]) {
  const values = resourceValues(resources);
  const byKind = { material: 0, labor: 0, equipment: 0, transport: 0 };
  resources.forEach((resource, index) => {
    byKind[resource.kind] += values[index] ?? 0;
  });
  return {
    ...byKind,
    total: byKind.material + byKind.labor + byKind.equipment + byKind.transport,
  };
}
