import { describe, expect, test } from "bun:test";
import {
  cleanGtin,
  decodeEntities,
  parsePrice,
  readProductPage,
} from "./pageParser";

// Made-up pages shaped like the ones shops publish; no real store's markup.

function page(head: string, body = "") {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

function jsonLd(value: unknown) {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

describe("parsePrice", () => {
  test("reads the ways shops write prices", () => {
    expect(parsePrice(45.99)).toBe(45.99);
    expect(parsePrice("45.99")).toBe(45.99);
    expect(parsePrice("45,99")).toBe(45.99);
    expect(parsePrice("1.234,56 lei")).toBe(1234.56);
    expect(parsePrice("1,234.56")).toBe(1234.56);
    expect(parsePrice("1.234.567")).toBe(1234567);
    expect(parsePrice("12")).toBe(12);
  });

  test("refuses what isn't a price", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("la cerere")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice(0)).toBeNull();
    expect(parsePrice(null)).toBeNull();
  });
});

describe("cleanGtin", () => {
  test("keeps 8 to 14 digits", () => {
    expect(cleanGtin("5940000000016")).toBe("5940000000016");
    expect(cleanGtin(5940000000016)).toBe("5940000000016");
    expect(cleanGtin("594 0000 000016")).toBe("5940000000016");
    expect(cleanGtin("12345")).toBeUndefined();
    expect(cleanGtin("ABC")).toBeUndefined();
  });
});

describe("decodeEntities", () => {
  test("decodes named and numeric entities", () => {
    expect(decodeEntities("Adeziv &amp; chit &#259;&#x219; &icirc;")).toBe(
      "Adeziv & chit ăș î",
    );
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
  });
});

describe("readProductPage", () => {
  test("reads a JSON-LD product with its offer", () => {
    const html = page(
      jsonLd({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Adeziv flexibil pentru plăci &amp; gresie, 25 kg",
        sku: "100200",
        gtin13: "5940000000016",
        offers: {
          "@type": "Offer",
          price: "45.90",
          priceCurrency: "RON",
          availability: "https://schema.org/InStock",
        },
      }) +
        '<link rel="canonical" href="https://www.example-store.ro/p/adeziv/100200">',
    );
    expect(readProductPage(html)).toEqual({
      title: "Adeziv flexibil pentru plăci & gresie, 25 kg",
      price: 45.9,
      ean: "5940000000016",
      sku: "100200",
      inStock: true,
      canonicalUrl: "https://www.example-store.ro/p/adeziv/100200",
    });
  });

  test("finds the product in a @graph and reads an aggregate offer", () => {
    const html = page(
      jsonLd({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "BreadcrumbList", itemListElement: [] },
          {
            "@type": ["Product", "Thing"],
            name: "Vopsea lavabilă albă 15 l",
            offers: {
              "@type": "AggregateOffer",
              lowPrice: 189,
              priceCurrency: "RON",
              offers: [{ "@type": "Offer", availability: "OutOfStock" }],
            },
          },
        ],
      }),
    );
    expect(readProductPage(html)).toMatchObject({
      title: "Vopsea lavabilă albă 15 l",
      price: 189,
    });
  });

  test("skips related products in lists and offers in other currencies", () => {
    const html = page(
      jsonLd({
        "@type": "ItemList",
        itemListElement: [
          { "@type": "Product", name: "Alt produs", offers: { price: 1 } },
        ],
      }) +
        jsonLd({
          "@type": "Product",
          name: "Glet de finisaj 20 kg",
          offers: [
            { "@type": "Offer", price: 9.5, priceCurrency: "EUR" },
            { "@type": "Offer", price: "47,50", priceCurrency: "RON" },
          ],
        }),
    );
    expect(readProductPage(html)).toMatchObject({
      title: "Glet de finisaj 20 kg",
      price: 47.5,
    });
  });

  test("falls back to the meta tags and keeps what JSON-LD said", () => {
    const html = page(
      jsonLd({
        "@type": "Product",
        name: "Ciment 40 kg",
        gtin13: "5940000000023",
      }) +
        '<meta property="og:title" content="Ciment 40 kg | Magazin">' +
        '<meta property="product:price:amount" content="32,90">' +
        '<meta property="product:price:currency" content="RON">' +
        '<meta property="product:availability" content="in stock">',
    );
    expect(readProductPage(html)).toEqual({
      title: "Ciment 40 kg",
      price: 32.9,
      ean: "5940000000023",
      sku: undefined,
      inStock: true,
    });
  });

  test("reads microdata", () => {
    const html = page(
      "<title>Silicon sanitar 280 ml - Magazin</title>",
      '<div itemscope itemtype="https://schema.org/Product"><h1 itemprop="name">Silicon sanitar <b>alb</b> 280 ml</h1>' +
        '<span itemprop="price" content="24.99">24,99 lei</span>' +
        '<meta itemprop="priceCurrency" content="RON">' +
        '<link itemprop="availability" href="https://schema.org/OutOfStock"></div>',
    );
    expect(readProductPage(html)).toMatchObject({
      title: "Silicon sanitar alb 280 ml",
      price: 24.99,
      inStock: false,
    });
  });

  test("ignores broken JSON-LD and pages without a price", () => {
    expect(
      readProductPage(
        page('<script type="application/ld+json">{ broken </script>'),
      ),
    ).toBeNull();
    expect(
      readProductPage(page("<title>Verificare de securitate</title>")),
    ).toBeNull();
  });
});
