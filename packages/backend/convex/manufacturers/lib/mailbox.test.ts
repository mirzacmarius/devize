import { describe, expect, test } from "bun:test";
import { hasDkim, hasDmarc, hasSpf, txtRecords } from "./mailbox";

describe("txtRecords", () => {
  test("joins a record's quoted strings and skips other types", () => {
    expect(
      txtRecords({
        Status: 0,
        Answer: [
          { type: 5, data: "devize.example." },
          { type: 16, data: '"v=spf1 include:_spf.google.com ~all"' },
          { type: 16, data: '"v=DKIM1; k=rsa; p=MIIB" "IjANBgkq"' },
        ],
      }),
    ).toEqual([
      "v=spf1 include:_spf.google.com ~all",
      "v=DKIM1; k=rsa; p=MIIBIjANBgkq",
    ]);
  });

  test("a name that doesn't exist has none; a failed answer can't be read", () => {
    expect(txtRecords({ Status: 3 })).toEqual([]);
    expect(txtRecords({ Status: 0 })).toEqual([]);
    expect(txtRecords({ Status: 2 })).toBeNull();
    expect(txtRecords("not json")).toBeNull();
  });
});

describe("the records", () => {
  test("SPF and DMARC are read from the start of a record", () => {
    expect(hasSpf(["google-site-verification=abc", "v=spf1 -all"])).toBe(true);
    expect(hasSpf(["v=spf10 nope"])).toBe(false);
    expect(hasDmarc(["v=DMARC1; p=none"])).toBe(true);
    expect(hasDmarc(["v=dmarc1;p=reject"])).toBe(true);
    expect(hasDmarc(["v=spf1 -all"])).toBe(false);
  });

  test("a DKIM key needs a public key; an empty one is revoked", () => {
    expect(hasDkim(["v=DKIM1; k=rsa; p=MIIBIjANBgkq"])).toBe(true);
    expect(hasDkim(["k=rsa;p=MIIB"])).toBe(true);
    expect(hasDkim(["v=DKIM1; p="])).toBe(false);
    expect(hasDkim([])).toBe(false);
  });
});
