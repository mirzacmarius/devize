// Turning a norms document's articles into one Normă per variant, and the
// checks that tell a reviewer whether the extraction read the tables right.

import {
  isHourUnit,
  isKnownUnit,
  isPercentUnit,
  normalizeUnit,
} from "../../lib/text";

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
    | "no_labor";
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
 * exactly when the columns were read right. The printed price is compared
 * when the document is reviewed, by `checkPrintedTotal`.
 */
export function checkNorm(
  norm: Pick<NormRow, "resources" | "totalLaborHours">,
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
  return issues;
}

export type PrintedTotalCheck = {
  // What the quantities and unit prices add up to, in lei.
  computed: number;
  // How far that is from the printed total, as a fraction of it.
  difference: number;
  matches: boolean;
};

/**
 * A Normă's printed total against its own quantities and unit prices, labour
 * at the document's hourly rate where a row has no price. Sundries in "%" are
 * a share of the other resources rather than a priced quantity, so they're
 * left out. A document that worked out its totals with other prices differs
 * on most variants; a misread quantity shows on one. Null without a printed
 * total or a price for every resource.
 */
export function checkPrintedTotal(
  norm: Pick<NormRow, "resources" | "totalPrice">,
  laborRate: number | undefined,
): PrintedTotalCheck | null {
  if (norm.totalPrice === undefined || norm.totalPrice <= 0) {
    return null;
  }
  let computed = 0;
  for (const resource of norm.resources) {
    if (isPercentUnit(resource.unit)) {
      continue;
    }
    const price =
      resource.unitPrice ??
      (resource.kind === "labor" && isHourUnit(resource.unit)
        ? laborRate
        : undefined);
    if (price === undefined) {
      return null;
    }
    computed += resource.quantity * price;
  }
  const difference = (computed - norm.totalPrice) / norm.totalPrice;
  return {
    computed: round(computed, 2),
    difference: round(difference, 4),
    matches: Math.abs(difference) <= 0.01,
  };
}

export type PrintedTotals = {
  // Variants with a printed total and a price for every resource.
  compared: number;
  // Of those, the ones whose total differs by more than 1%.
  differing: number;
};

/**
 * How a document's printed totals compare with its own quantities and unit
 * prices, over the variants a reviewer hasn't rejected.
 */
export function printedTotals(
  norms: Pick<NormRow, "resources" | "totalPrice">[],
  laborRate: number | undefined,
): PrintedTotals {
  let compared = 0;
  let differing = 0;
  for (const norm of norms) {
    const check = checkPrintedTotal(norm, laborRate);
    if (check) {
      compared += 1;
      if (!check.matches) {
        differing += 1;
      }
    }
  }
  return { compared, differing };
}

/**
 * Whether the document itself worked out its totals with other prices: most
 * of its variants differ, which a misread row or two can't explain. Only then
 * is it worth telling the manufacturer.
 */
export function totalsMostlyDiffer({ compared, differing }: PrintedTotals) {
  return compared >= 2 && differing * 2 > compared;
}

/**
 * One Normă per variant of an extracted article: TST10 with variants A01 and
 * B01 gives TST10A01 and TST10B01, titled "<article>, <variant>".
 */
export function normsFromArticle(article: ExtractedArticle): NormRow[] {
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
      checks: checkNorm({ resources, ...totals }),
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
