import type { Store } from "./resolve";

// What Devize needs to know about the four retailers' sites (docs/adr/0003).

/** The VAT rate store prices include, in percent. */
export const retailVat = 21;

/**
 * Each store's site, by the key Devize stores. Brico Dépôt became BRICO, part
 * of Altex, in 2025 and sells online at bricostore.ro; its key stays
 * `brico_depot`, so rows already saved keep their meaning.
 */
export const storeSites: Record<Store, { home: string; domains: string[] }> = {
  dedeman: { home: "https://www.dedeman.ro", domains: ["dedeman.ro"] },
  leroy_merlin: {
    home: "https://www.leroymerlin.ro",
    domains: ["leroymerlin.ro"],
  },
  hornbach: { home: "https://www.hornbach.ro", domains: ["hornbach.ro"] },
  brico_depot: {
    home: "https://bricostore.ro",
    domains: ["bricostore.ro", "bricodepot.ro"],
  },
};

export const storeKeys = Object.keys(storeSites) as Store[];

/** The store whose site a host name belongs to, or null for any other site. */
export function storeOfHost(hostname: string): Store | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    storeKeys.find((store) =>
      storeSites[store].domains.some(
        (domain) => host === domain || host.endsWith(`.${domain}`),
      ),
    ) ?? null
  );
}

/**
 * The store a product page belongs to and the page's address without its
 * query or fragment, which is how Devize stores and caches it. Null for any
 * other site, a store's home page, or an address that isn't plain HTTP(S).
 */
export function productPage(
  value: string,
): { store: Store; url: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }
  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username ||
    parsed.password ||
    parsed.port
  ) {
    return null;
  }
  const store = storeOfHost(parsed.hostname);
  if (!store || parsed.pathname.replace(/\/+$/, "") === "") {
    return null;
  }
  return {
    store,
    url: `https://${parsed.hostname.toLowerCase()}${parsed.pathname}`,
  };
}
