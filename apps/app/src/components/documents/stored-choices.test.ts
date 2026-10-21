import { describe, expect, test } from "bun:test";
import { parseChoices, type StoredChoices } from "./stored-choices";

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
      }),
    ).toEqual({
      kinds: ["F1"],
      labels: { C5: "Lista C5" },
      subchapters: { furniture: "4.5" },
    });
  });

  test("starts afresh from anything else", () => {
    for (const value of [null, "F1", 3, ["F1"], undefined]) {
      expect(parseChoices(value)).toEqual({});
    }
  });
});
