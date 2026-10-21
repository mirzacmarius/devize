import { describe, expect, test } from "bun:test";
import { productPage, storeOfHost } from "./stores";

describe("store pages", () => {
  test("recognizes the four stores' sites", () => {
    expect(storeOfHost("www.dedeman.ro")).toBe("dedeman");
    expect(storeOfHost("WWW.LEROYMERLIN.RO")).toBe("leroy_merlin");
    expect(storeOfHost("hornbach.ro")).toBe("hornbach");
    expect(storeOfHost("bricostore.ro")).toBe("brico_depot");
    expect(storeOfHost("dedeman.ro.example.com")).toBeNull();
    expect(storeOfHost("notdedeman.ro")).toBeNull();
  });

  test("keeps a product page's address without query or fragment", () => {
    expect(
      productPage(" https://www.dedeman.ro/ro/adeziv/p/100200?x=1#detalii "),
    ).toEqual({
      store: "dedeman",
      url: "https://www.dedeman.ro/ro/adeziv/p/100200",
    });
    expect(productPage("http://hornbach.ro/p/vopsea/123/")).toEqual({
      store: "hornbach",
      url: "https://hornbach.ro/p/vopsea/123/",
    });
  });

  test("refuses other sites, home pages and odd addresses", () => {
    expect(productPage("https://www.example.com/p/1")).toBeNull();
    expect(productPage("https://www.dedeman.ro/")).toBeNull();
    expect(productPage("ftp://www.dedeman.ro/p/1")).toBeNull();
    expect(productPage("https://user:pass@www.dedeman.ro/p/1")).toBeNull();
    expect(productPage("https://www.dedeman.ro:8443/p/1")).toBeNull();
    expect(productPage("nu e un link")).toBeNull();
  });
});
