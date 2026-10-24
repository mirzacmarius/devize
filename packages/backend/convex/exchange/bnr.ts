// The National Bank of Romania's reference rates, as it publishes them each
// banking day around 13:00 (Romanian time) at BNR_RATES_URL: an XML DataSet
// with one Cube for the day and a Rate per currency, in lei for one unit,
// or for `multiplier` units of the weaker ones (100 HUF). See docs/adr/0042.

export const BNR_RATES_URL = "https://www.bnr.ro/nbrfxrates.xml";

export type BnrRates = {
  // The day the rates are for, as YYYY-MM-DD.
  date: string;
  // Lei for one unit of each currency.
  rates: Record<string, number>;
};

/** The day's rates from BNR's XML, or undefined when it isn't that document. */
export function parseBnrRates(xml: string): BnrRates | undefined {
  const cube = /<Cube\s+date="(\d{4}-\d{2}-\d{2})"\s*>([\s\S]*?)<\/Cube>/.exec(
    xml,
  );
  if (!cube?.[1] || !cube[2]) {
    return undefined;
  }
  const rates: Record<string, number> = {};
  const rate =
    /<Rate\s+currency="([A-Z]{3})"(?:\s+multiplier="(\d+)")?\s*>\s*([\d.]+)\s*<\/Rate>/g;
  for (const match of cube[2].matchAll(rate)) {
    const [, currency, multiplier, value] = match;
    const lei = Number(value) / Number(multiplier ?? 1);
    if (currency && Number.isFinite(lei) && lei > 0) {
      rates[currency] = lei;
    }
  }
  return Object.keys(rates).length > 0 ? { date: cube[1], rates } : undefined;
}
