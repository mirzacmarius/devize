// Turning a norms document's articles into one Normă per variant, and the
// checks that tell a reviewer whether the extraction read the tables right.

import { isHourUnit, isKnownUnit, normalizeUnit } from "../../lib/text";

export type ResourceKind = "material" | "labor" | "equipment" | "transport";

export type ExtractedResource = {
  kind: ResourceKind;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number | null;
};

export type ExtractedVariant = {
  code: string;
  description: string;
  resources: ExtractedResource[];
  totalLaborHours: number | null;
  totalPrice: number | null;
};

export type ExtractedArticle = {
  baseCode: string;
  title: string;
  unit: string;
  pages: number[];
  includes: string | null;
  excludes: string | null;
  variants: ExtractedVariant[];
};

export type NormIssue = {
  code:
    | "no_resources"
    | "quantity_invalid"
    | "unit_unknown"
    | "labor_sum"
    | "no_labor"
    | "price_total";
  level: "error" | "warning" | "info";
  detail?: string;
};

export type NormRow = {
  baseCode: string;
  code: string;
  title: string;
  unit: string;
  unitRaw: string;
  pages: number[];
  includes?: string;
  excludes?: string;
  resources: {
    kind: ResourceKind;
    name: string;
    unit: string;
    unitRaw: string;
    quantity: number;
    unitPrice?: number;
  }[];
  totalLaborHours?: number;
  totalPrice?: number;
  checks: NormIssue[];
};

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * The checks on one extracted Normă. The labour sum is the strongest: every
 * trade's hours must add up to the printed "Total manoperă", which they do
 * exactly when the columns were read right. Printed prices often no longer
 * match the unit prices, so that difference is only reported.
 */
export function checkNorm(
  norm: Pick<NormRow, "resources" | "totalLaborHours" | "totalPrice">,
  options: { laborRate?: number } = {},
): NormIssue[] {
  const issues: NormIssue[] = [];
  if (norm.resources.length === 0) {
    issues.push({ code: "no_resources", level: "error" });
    return issues;
  }
  for (const resource of norm.resources) {
    if (!Number.isFinite(resource.quantity) || resource.quantity <= 0) {
      issues.push({
        code: "quantity_invalid",
        level: "error",
        detail: resource.name,
      });
    }
  }
  const unknownUnits = new Set(
    norm.resources
      .filter((resource) => !isKnownUnit(resource.unitRaw))
      .map((resource) => resource.unitRaw),
  );
  for (const unit of unknownUnits) {
    issues.push({ code: "unit_unknown", level: "warning", detail: unit });
  }

  const labor = norm.resources.filter((resource) => resource.kind === "labor");
  if (labor.length === 0) {
    issues.push({ code: "no_labor", level: "info" });
  }
  if (norm.totalLaborHours !== undefined) {
    const sum = labor
      .filter((resource) => isHourUnit(resource.unit))
      .reduce((total, resource) => total + resource.quantity, 0);
    const difference = Math.abs(sum - norm.totalLaborHours);
    const tolerance = Math.max(0.0005, norm.totalLaborHours * 0.001);
    if (difference > tolerance) {
      const relative =
        norm.totalLaborHours > 0 ? difference / norm.totalLaborHours : 1;
      issues.push({
        code: "labor_sum",
        level: relative <= 0.02 ? "warning" : "error",
        detail: `${round(sum)} h / ${round(norm.totalLaborHours)} h`,
      });
    }
  }

  if (norm.totalPrice !== undefined && norm.totalPrice > 0) {
    let computed = 0;
    let priced = true;
    for (const resource of norm.resources) {
      const price =
        resource.unitPrice ??
        (resource.kind === "labor" && isHourUnit(resource.unit)
          ? options.laborRate
          : undefined);
      if (price === undefined) {
        priced = false;
        break;
      }
      computed += resource.quantity * price;
    }
    if (priced) {
      const relative = (computed - norm.totalPrice) / norm.totalPrice;
      if (Math.abs(relative) > 0.01) {
        issues.push({
          code: "price_total",
          level: "info",
          detail: `${round(computed, 2)} / ${round(norm.totalPrice, 2)} (${relative > 0 ? "+" : ""}${round(relative * 100, 1)}%)`,
        });
      }
    }
  }
  return issues;
}

/**
 * One Normă per variant of an extracted article: TST10 with variants A01 and
 * B01 gives TST10A01 and TST10B01, titled "<article>, <variant>".
 */
export function normsFromArticle(
  article: ExtractedArticle,
  options: { laborRate?: number } = {},
): NormRow[] {
  const baseCode = article.baseCode.replace(/\s+/g, "");
  const articleTitle = article.title.trim().replace(/[:;,.\s]+$/, "");
  const unit = normalizeUnit(article.unit);
  const seen = new Set<string>();
  const rows: NormRow[] = [];
  for (const variant of article.variants) {
    const variantCode = variant.code.replace(/\s+/g, "").replace(/\.$/, "");
    const code = variantCode.startsWith(baseCode)
      ? variantCode
      : `${baseCode}${variantCode}`;
    if (seen.has(code)) {
      continue;
    }
    seen.add(code);
    const description = variant.description.trim().replace(/[;,.\s]+$/, "");
    const resources = variant.resources.map((resource) => ({
      kind: resource.kind,
      name: resource.name.replace(/\s+/g, " ").trim(),
      unit: normalizeUnit(resource.unit),
      unitRaw: resource.unit.trim(),
      quantity: resource.quantity,
      ...(resource.unitPrice === null ? {} : { unitPrice: resource.unitPrice }),
    }));
    const totals = {
      ...(variant.totalLaborHours === null
        ? {}
        : { totalLaborHours: variant.totalLaborHours }),
      ...(variant.totalPrice === null
        ? {}
        : { totalPrice: variant.totalPrice }),
    };
    rows.push({
      baseCode,
      code,
      title: description ? `${articleTitle}, ${description}` : articleTitle,
      unit,
      unitRaw: article.unit.trim(),
      pages: article.pages,
      ...(article.includes ? { includes: article.includes } : {}),
      ...(article.excludes ? { excludes: article.excludes } : {}),
      resources,
      ...totals,
      checks: checkNorm({ resources, ...totals }, options),
    });
  }
  return rows;
}

/**
 * Groups a document's articles for extraction, a few variants per request, so
 * each answer stays short enough to read whole. An article bigger than the
 * limit goes alone.
 */
export function batchArticles<T extends { variantCodes: string[] }>(
  articles: T[],
  maxVariants: number,
): T[][] {
  const batches: T[][] = [];
  let batch: T[] = [];
  let variants = 0;
  for (const article of articles) {
    const size = Math.max(1, article.variantCodes.length);
    if (batch.length > 0 && variants + size > maxVariants) {
      batches.push(batch);
      batch = [];
      variants = 0;
    }
    batch.push(article);
    variants += size;
  }
  if (batch.length > 0) {
    batches.push(batch);
  }
  return batches;
}
