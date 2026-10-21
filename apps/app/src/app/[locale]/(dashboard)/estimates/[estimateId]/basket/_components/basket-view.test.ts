import { describe, expect, test } from "bun:test";
import { searchUrl, shoppingList, withoutVat } from "./basket-view";

describe("searchUrl", () => {
  test("searches one store's site for the material", () => {
    expect(searchUrl("brico_depot", "Adeziv flexibil C2TE")).toBe(
      "https://www.google.com/search?q=site%3Abricostore.ro%20Adeziv%20flexibil%20C2TE",
    );
  });
});

describe("withoutVat", () => {
  test("takes the VAT out of a store price", () => {
    expect(withoutVat(121, 21)).toBeCloseTo(100);
    expect(withoutVat(50, 0)).toBe(50);
  });
});

describe("shoppingList", () => {
  test("lists each product with its count, price and link, then the total", () => {
    expect(
      shoppingList({
        heading: "Dedeman · DVZ-0007 Baie",
        items: [
          {
            count: 5,
            title: "Adeziv C2TE 25 kg",
            price: "45,90 lei",
            url: "https://www.dedeman.ro/p/1",
          },
          { count: 2, title: "Chit 5 kg", price: "30,00 lei" },
        ],
        total: "Total: 289,50 lei cu TVA",
      }),
    ).toBe(
      [
        "Dedeman · DVZ-0007 Baie",
        "",
        "5 × Adeziv C2TE 25 kg · 45,90 lei · https://www.dedeman.ro/p/1",
        "2 × Chit 5 kg · 30,00 lei",
        "",
        "Total: 289,50 lei cu TVA",
      ].join("\n"),
    );
  });
});
