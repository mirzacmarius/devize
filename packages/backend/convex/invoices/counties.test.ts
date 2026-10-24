import { describe, expect, test } from "bun:test";
import { buyerFromAnaf, splitAnafAddress } from "./anaf";
import { countyCode, findCounty, isSectorName, xmlCityName } from "./counties";
import { splitAddress } from "./helpers";

describe("counties and addresses", () => {
  test("finds a county however it is written", () => {
    expect(findCounty("Cluj")).toEqual({ name: "Cluj", code: "RO-CJ" });
    expect(findCounty("jud. Cluj")?.code).toBe("RO-CJ");
    expect(findCounty("Județul Cluj")?.code).toBe("RO-CJ");
    expect(findCounty("CJ")?.code).toBe("RO-CJ");
    expect(findCounty("RO-CJ")?.name).toBe("Cluj");
    expect(findCounty("timis")?.name).toBe("Timiș");
    expect(findCounty("Municipiul București")?.code).toBe("RO-B");
    expect(findCounty("bucuresti")?.code).toBe("RO-B");
    expect(findCounty("Paris")).toBeUndefined();
    expect(countyCode(undefined)).toBeUndefined();
  });

  test("writes București's sectors as the XML wants them", () => {
    expect(xmlCityName("Sector 3", "București")).toBe("SECTOR3");
    expect(xmlCityName("sectorul 2", "Municipiul București")).toBe("SECTOR2");
    expect(xmlCityName("București, sector 6", "București")).toBe("SECTOR6");
    expect(xmlCityName("București", "București")).toBe("București");
    expect(xmlCityName("Cluj-Napoca", "Cluj")).toBe("Cluj-Napoca");
    expect(xmlCityName("  ", "Cluj")).toBeUndefined();
    expect(isSectorName("SECTOR3")).toBe(true);
    expect(isSectorName("Sector 3")).toBe(false);
  });

  test("splits a typed address into street, city and county", () => {
    expect(splitAddress("Str. Fabricii 10, Cluj-Napoca, jud. Cluj")).toEqual({
      street: "Str. Fabricii 10",
      city: "Cluj-Napoca",
      county: "Cluj",
    });
    expect(splitAddress("Str. Fabricii 10, Cluj-Napoca, Cluj")).toEqual({
      street: "Str. Fabricii 10",
      city: "Cluj-Napoca",
      county: "Cluj",
    });
    expect(splitAddress("Bd. Unirii 5, Sector 3, București")).toEqual({
      street: "Bd. Unirii 5",
      city: "Sector 3",
      county: "București",
    });
    expect(splitAddress("Str. Lungă 1, București")).toEqual({
      street: "Str. Lungă 1",
      city: "București",
      county: "București",
    });
    expect(splitAddress("Str. Lungă 1")).toEqual({ street: "Str. Lungă 1" });
    expect(splitAddress("Cluj-Napoca, Cluj")).toEqual({
      city: "Cluj-Napoca",
      county: "Cluj",
    });
    expect(splitAddress(undefined)).toEqual({});
  });

  test("splits ANAF's address, which starts with the county", () => {
    expect(
      splitAnafAddress("JUD. CLUJ, MUN. CLUJ-NAPOCA, STR. FABRICII, NR. 10"),
    ).toEqual({
      street: "Str. Fabricii, Nr. 10",
      city: "Cluj-Napoca",
      county: "Cluj",
    });
    expect(
      splitAnafAddress(
        "MUNICIPIUL BUCUREŞTI, SECTOR 1, STR. AVIATORILOR, NR. 2",
      ),
    ).toEqual({
      street: "Str. Aviatorilor, Nr. 2",
      city: "Sector 1",
      county: "București",
    });
    // Not ANAF's shape: read as a typed address.
    expect(splitAnafAddress("Str. Lungă 1, Brașov, Brașov")).toEqual({
      street: "Str. Lungă 1",
      city: "Brașov",
      county: "Brașov",
    });
  });

  test("the register settles the VAT standing and fills the gaps, or replaces when asked", () => {
    const current = {
      name: "Rockwool",
      kind: "company" as const,
      cui: "12345674",
      vatRegistered: false,
      address: "Str. Veche 1",
    };
    const anaf = {
      outcome: "found" as const,
      checkedAt: 1,
      name: "ROCKWOOL ROMANIA S.R.L.",
      address: "JUD. CLUJ, MUN. CLUJ-NAPOCA, STR. FABRICII, NR. 10",
      tradeRegister: "J12/1/2000",
      vatPayer: true,
    };
    expect(buyerFromAnaf(current, anaf, false)).toEqual({
      ...current,
      vatRegistered: true,
      tradeRegister: "J12/1/2000",
      city: "Cluj-Napoca",
      county: "Cluj",
    });
    expect(buyerFromAnaf(current, anaf, true)).toEqual({
      ...current,
      name: "ROCKWOOL ROMANIA S.R.L.",
      vatRegistered: true,
      tradeRegister: "J12/1/2000",
      address: "Str. Fabricii, Nr. 10",
      city: "Cluj-Napoca",
      county: "Cluj",
    });
    expect(
      buyerFromAnaf(current, { outcome: "not_found", checkedAt: 1 }, true),
    ).toBe(current);
  });
});
