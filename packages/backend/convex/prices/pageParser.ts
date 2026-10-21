// Reads a product's price from a store's page, from the structured data shops
// publish for search engines: schema.org Product in JSON-LD, else the Open
// Graph and microdata tags. Nothing here knows a particular store's layout,
// so a redesign of a store's pages rarely breaks it.

export type ProductPage = {
  title: string;
  // Lei, as the page shows it: with VAT.
  price: number;
  ean?: string;
  sku?: string;
  inStock?: boolean;
  // The page's own address for itself, when it names one.
  canonicalUrl?: string;
};

// Pages beyond this size are read only up to it.
const maxHtmlLength = 3_000_000;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  abreve: "ă",
  Abreve: "Ă",
  acirc: "â",
  Acirc: "Â",
  icirc: "î",
  Icirc: "Î",
  scedil: "ş",
  Scedil: "Ş",
  tcedil: "ţ",
  Tcedil: "Ţ",
};

export function decodeEntities(text: string): string {
  return text.replace(
    /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (entity, code: string) => {
      if (code.startsWith("#")) {
        const value =
          code[1] === "x" || code[1] === "X"
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);
        return value > 0 && value < 0x110000
          ? String.fromCodePoint(value)
          : entity;
      }
      return namedEntities[code] ?? entity;
    },
  );
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }
  const text = decodeEntities(String(value)).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
}

/**
 * A price as shops write it: 45.99, "45,99", "1.234,56 lei" or "1,234.56".
 * The last separator is the decimal one when both appear.
 */
export function parsePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string" || value.includes("-")) {
    return null;
  }
  let text = value.replace(/[^\d.,]/g, "");
  if (!/\d/.test(text)) {
    return null;
  }
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    text = text.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    text =
      text.indexOf(",") === lastComma
        ? text.replace(",", ".")
        : text.replace(/,/g, "");
  } else if (text.indexOf(".") !== lastDot) {
    text = text.replace(/\./g, "");
  }
  const price = Number(text);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/** A GTIN (EAN-8, UPC, EAN-13 or GTIN-14) as digits, or undefined. */
export function cleanGtin(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }
  const digits = String(value).replace(/\s/g, "");
  return /^\d{8,14}$/.test(digits) ? digits : undefined;
}

function availability(value: unknown): boolean | undefined {
  const text = typeof value === "string" ? value : "";
  const name = text
    .replace(/^.*[/:#]/, "")
    .toLowerCase()
    .replace(/[\s_]/g, "");
  if (
    ["instock", "limitedavailability", "instoreonly", "onlineonly"].includes(
      name,
    )
  ) {
    return true;
  }
  if (["outofstock", "soldout", "discontinued"].includes(name)) {
    return false;
  }
  return undefined;
}

// Store prices are in lei; a page in another currency isn't one to use.
function isLei(currency: unknown): boolean {
  return (
    currency === undefined ||
    (typeof currency === "string" &&
      ["", "RON", "LEI", "LEU"].includes(currency.trim().toUpperCase()))
  );
}

function hasType(node: JsonObject, type: string): boolean {
  return asArray(node["@type"]).some(
    (value) =>
      typeof value === "string" && value.replace(/^.*[/:#]/, "") === type,
  );
}

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const pattern =
    /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    const body = (match[1] ?? "")
      .trim()
      .replace(/^(?:<!--|\/\/\s*<!\[CDATA\[)/, "")
      .replace(/(?:-->|\/\/\s*\]\]>)$/, "")
      .trim();
    try {
      blocks.push(JSON.parse(body));
    } catch {
      // Some shops publish broken JSON-LD; the meta tags may still help.
    }
  }
  return blocks;
}

// The page's own products, not lists of related ones.
function* productNodes(value: unknown, depth = 0): Generator<JsonObject> {
  if (depth > 6) {
    return;
  }
  for (const item of asArray(value)) {
    if (!isObject(item)) {
      continue;
    }
    if (hasType(item, "Product")) {
      yield item;
    }
    for (const key of ["@graph", "mainEntity", "hasVariant"]) {
      if (key in item) {
        yield* productNodes(item[key], depth + 1);
      }
    }
  }
}

function offerOf(
  offers: unknown,
  depth = 0,
): { price: number; inStock?: boolean; gtin?: unknown } | null {
  for (const offer of asArray(offers)) {
    if (!isObject(offer) || !isLei(offer.priceCurrency)) {
      continue;
    }
    const specification = asArray(offer.priceSpecification).find(isObject);
    const price =
      parsePrice(offer.price) ??
      parsePrice(offer.lowPrice) ??
      parsePrice(specification?.price);
    if (price !== null) {
      return {
        price,
        inStock: availability(offer.availability),
        gtin: offer.gtin13 ?? offer.gtin,
      };
    }
    if (depth === 0 && offer.offers !== undefined) {
      const nested = offerOf(offer.offers, depth + 1);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

type PageProduct = Omit<ProductPage, "canonicalUrl">;

/**
 * The first JSON-LD product with a price in lei, or else what the first
 * product without one says about itself, for the meta tags' price.
 */
function fromJsonLd(html: string): {
  product?: PageProduct;
  described?: Partial<PageProduct>;
} {
  let described: Partial<PageProduct> | undefined;
  for (const block of jsonLdBlocks(html)) {
    for (const node of productNodes(block)) {
      const offer = offerOf(node.offers);
      const title = cleanText(node.name, 300);
      const ean = cleanGtin(
        node.gtin13 ??
          node.gtin ??
          node.gtin14 ??
          node.gtin12 ??
          node.gtin8 ??
          node.ean ??
          offer?.gtin,
      );
      const sku = cleanText(node.sku ?? node.productID ?? node.mpn, 100);
      if (offer && title) {
        return {
          product: {
            title,
            price: Math.round(offer.price * 100) / 100,
            ean,
            sku,
            inStock: offer.inStock,
          },
        };
      }
      described ??= { title, ean, sku };
    }
  }
  return { described };
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();
    if (name && !(name in result)) {
      result[name] = match[2] ?? match[3] ?? match[4] ?? "";
    }
  }
  return result;
}

/** Open Graph, `name` and microdata values by key, the first of each. */
function tagValues(html: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const match of html.matchAll(
    /<(?:meta|link|[a-z]+\s[^>]*itemprop)\b[^>]*>/gi,
  )) {
    const attrs = attributes(match[0]);
    const key = attrs.property ?? attrs.itemprop ?? attrs.name;
    const value = attrs.content ?? attrs.href;
    if (key && value !== undefined && !values.has(key.toLowerCase())) {
      values.set(key.toLowerCase(), value);
    }
  }
  return values;
}

function fromTags(
  html: string,
  values: Map<string, string>,
): PageProduct | null {
  const currency =
    values.get("product:price:currency") ??
    values.get("og:price:currency") ??
    values.get("pricecurrency");
  const price = parsePrice(
    values.get("product:price:amount") ??
      values.get("og:price:amount") ??
      values.get("price"),
  );
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  const title =
    cleanText(values.get("og:title"), 300) ??
    cleanText(heading?.replace(/<[^>]*>/g, " "), 300) ??
    cleanText(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 300);
  if (price === null || !title || !isLei(currency)) {
    return null;
  }
  return {
    title,
    price: Math.round(price * 100) / 100,
    ean: cleanGtin(
      values.get("gtin13") ??
        values.get("gtin") ??
        values.get("product:ean") ??
        values.get("gtin14") ??
        values.get("gtin12") ??
        values.get("gtin8"),
    ),
    sku: cleanText(values.get("sku") ?? values.get("productid"), 100),
    inStock: availability(
      values.get("product:availability") ??
        values.get("og:availability") ??
        values.get("availability"),
    ),
  };
}

function canonicalOf(html: string): string | undefined {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs.rel?.toLowerCase() === "canonical" && attrs.href) {
      return decodeEntities(attrs.href).trim();
    }
  }
  return undefined;
}

/**
 * The product a store's page sells and its price, or null when the page
 * publishes no price in lei (an error page, a captcha, a category page).
 */
export function readProductPage(html: string): ProductPage | null {
  const page = html.slice(0, maxHtmlLength);
  const jsonLd = fromJsonLd(page);
  let product = jsonLd.product;
  if (!product) {
    const tagged = fromTags(page, tagValues(page));
    const described = jsonLd.described;
    product = tagged
      ? {
          ...tagged,
          title: described?.title ?? tagged.title,
          ean: described?.ean ?? tagged.ean,
          sku: described?.sku ?? tagged.sku,
        }
      : undefined;
  }
  if (!product) {
    return null;
  }
  const canonicalUrl = canonicalOf(page);
  return canonicalUrl ? { ...product, canonicalUrl } : product;
}
