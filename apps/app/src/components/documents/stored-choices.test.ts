import { describe, expect, test } from "bun:test";
import {
  parseChoices,
  parseSigner,
  type StoredChoices,
} from "./stored-choices";

describe("parseChoices", () => {
  test("keeps what the sheet knows", () => {
    const choices: StoredChoices = {
      kinds: ["F1", "F3", "C6"],
      labels: { F3: "Formularul 3" },
      withValues: false,
      scope: "category",
      subchapters: { boiler: "4.1.4" },
      beneficiary: "Comuna Exemplu",
      designer: "",
      months: 12,
      windows: { boiler: { start: 9, end: 12 } },
      validity: 90,
      signer: "Ion Popescu",
      role: "administrator",
    };
    expect(parseChoices(JSON.parse(JSON.stringify(choices)))).toEqual(choices);
  });

  test("drops what an older or newer sheet left", () => {
    expect(
      parseChoices({
        kinds: ["F1", "F9", 3],
        labels: { F3: 3, X1: "Formularul X", C5: "Lista C5" },
        withValues: "yes",
        scope: "lot",
        subchapters: { boiler: "4.7", furniture: "4.5" },
        beneficiary: null,
        months: 40,
        windows: {
          boiler: { start: 3, end: 2 },
          furniture: { start: 1.5, end: 2 },
          huts: { start: 1, end: 1 },
          site: "1-2",
        },
        validity: 400,
        signer: 3,
      }),
    ).toEqual({
      kinds: ["F1"],
      labels: { C5: "Lista C5" },
      subchapters: { furniture: "4.5" },
      windows: { huts: { start: 1, end: 1 } },
    });
  });

  test("takes an offer's validity in whole days, up to a year", () => {
    for (const validity of [0, 1.5, 366, "90"]) {
      expect(parseChoices({ validity })).toEqual({});
    }
    expect(parseChoices({ validity: 365 })).toEqual({ validity: 365 });
  });

  test("starts afresh from anything else", () => {
    for (const value of [null, "F1", 3, ["F1"], undefined]) {
      expect(parseChoices(value)).toEqual({});
    }
  });
});

describe("parseSigner", () => {
  test("keeps who signs, without spaces around", () => {
    expect(
      parseSigner({ signer: " Ion Popescu ", role: "administrator", x: 1 }),
    ).toEqual({ signer: "Ion Popescu", role: "administrator" });
    expect(parseSigner({ signer: " ", role: 3 })).toEqual({});
    expect(parseSigner("Ion Popescu")).toEqual({});
  });
});
