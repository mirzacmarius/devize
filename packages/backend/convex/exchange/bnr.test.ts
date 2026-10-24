import { describe, expect, test } from "bun:test";
import { parseBnrRates } from "./bnr";

// The shape of https://www.bnr.ro/nbrfxrates.xml, with made-up figures.
const xml = `<?xml version="1.0" encoding="utf-8"?>
<DataSet xmlns="http://www.bnr.ro/xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.bnr.ro/xsd nbrfxrates.xsd">
  <Header>
    <Publisher>National Bank of Romania</Publisher>
    <PublishingDate>2026-10-23</PublishingDate>
    <MessageType>DR</MessageType>
  </Header>
  <Body>
    <Subject>Reference rates</Subject>
    <OrigCurrency>RON</OrigCurrency>
    <Cube date="2026-10-23">
      <Rate currency="AED">1.2061</Rate>
      <Rate currency="EUR">4.9772</Rate>
      <Rate currency="HUF" multiplier="100">1.2345</Rate>
      <Rate currency="USD">4.4301</Rate>
    </Cube>
  </Body>
</DataSet>`;

describe("BNR's reference rates", () => {
  test("read the day and the lei for one unit", () => {
    const parsed = parseBnrRates(xml);
    expect(parsed?.date).toBe("2026-10-23");
    expect(parsed?.rates.EUR).toBe(4.9772);
    expect(parsed?.rates.USD).toBe(4.4301);
    expect(parsed?.rates.HUF).toBeCloseTo(0.012345, 8);
  });

  test("refuse anything else", () => {
    expect(parseBnrRates("")).toBeUndefined();
    expect(
      parseBnrRates("<html><body>Maintenance</body></html>"),
    ).toBeUndefined();
    expect(parseBnrRates('<Cube date="2026-10-23"></Cube>')).toBeUndefined();
  });
});
