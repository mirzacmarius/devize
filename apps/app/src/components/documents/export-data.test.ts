import { describe, expect, test } from "bun:test";
import { fileName } from "./export-data";

describe("fileName", () => {
  test("names a PDF after the Deviz, without characters files can't have", () => {
    expect(fileName("DVZ-0142", "Renovare apartament")).toBe(
      "DVZ-0142 Renovare apartament.pdf",
    );
    expect(fileName("DVZ-0142-R2", 'Bloc A/B: "fațadă"')).toBe(
      "DVZ-0142-R2 Bloc A B fațadă.pdf",
    );
    expect(fileName("DVZ-0001", "  ")).toBe("DVZ-0001.pdf");
  });
});
