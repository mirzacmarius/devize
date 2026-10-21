import { describe, expect, test } from "bun:test";
import {
  countOf,
  leiInFiguresAndWords,
  leiInWords,
  numberInWords,
} from "./words";

describe("leiInWords", () => {
  test.each([
    [0, "zero lei"],
    [1, "un leu"],
    [2, "doi lei"],
    [12, "doisprezece lei"],
    [19, "nouăsprezece lei"],
    [20, "douăzeci de lei"],
    [21, "douăzeci și unu de lei"],
    [22, "douăzeci și doi de lei"],
    [100, "o sută de lei"],
    [101, "o sută unu lei"],
    [112, "o sută doisprezece lei"],
    [120, "o sută douăzeci de lei"],
    [200, "două sute de lei"],
    [999, "nouă sute nouăzeci și nouă de lei"],
    [1000, "o mie de lei"],
    [1001, "o mie unu lei"],
    [1019, "o mie nouăsprezece lei"],
    [2000, "două mii de lei"],
    [12_000, "douăsprezece mii de lei"],
    [21_000, "douăzeci și una de mii de lei"],
    [22_000, "douăzeci și două de mii de lei"],
    [100_000, "o sută de mii de lei"],
    [101_000, "o sută una mii de lei"],
    [200_002, "două sute de mii doi lei"],
    [1_000_000, "un milion de lei"],
    [2_000_000, "două milioane de lei"],
    [12_000_000, "douăsprezece milioane de lei"],
    [21_000_000, "douăzeci și unu de milioane de lei"],
    [1_000_000_000, "un miliard de lei"],
    [2_500_000_000, "două miliarde cinci sute de milioane de lei"],
  ])("%d lei", (amount, words) => {
    expect(leiInWords(amount)).toBe(words);
  });

  test("adds the bani, agreeing like the lei", () => {
    expect(leiInWords(1_234_567.89)).toBe(
      "un milion două sute treizeci și patru de mii cinci sute șaizeci și șapte de lei și optzeci și nouă de bani",
    );
    expect(leiInWords(0.01)).toBe("zero lei și un ban");
    expect(leiInWords(15.05)).toBe("cincisprezece lei și cinci bani");
    expect(leiInWords(3.2)).toBe("trei lei și douăzeci de bani");
    expect(leiInWords(1.21)).toBe("un leu și douăzeci și unu de bani");
  });

  test("leaves out float noise and marks what is owed back", () => {
    expect(leiInWords(0.1 + 0.2)).toBe("zero lei și treizeci de bani");
    expect(leiInWords(-5)).toBe("minus cinci lei");
  });
});

test("numberInWords agrees with what it counts", () => {
  expect(numberInWords(2, "masculine")).toBe("doi");
  expect(numberInWords(2, "feminine")).toBe("două");
  expect(numberInWords(2, "neuter")).toBe("două");
  expect(numberInWords(21, "feminine")).toBe("douăzeci și una");
  expect(numberInWords(21, "neuter")).toBe("douăzeci și unu");
  expect(numberInWords(12, "feminine")).toBe("douăsprezece");
});

test("an offer form's amount, in figures and in words", () => {
  expect(leiInFiguresAndWords(1234.5)).toBe(
    "1.234,50 lei (o mie două sute treizeci și patru de lei și cincizeci de bani)",
  );
});

test("countOf puts de where Romanian does", () => {
  expect(countOf(1, "lună", "luni")).toBe("1 lună");
  expect(countOf(6, "lună", "luni")).toBe("6 luni");
  expect(countOf(19, "lună", "luni")).toBe("19 luni");
  expect(countOf(20, "lună", "luni")).toBe("20 de luni");
  expect(countOf(36, "lună", "luni")).toBe("36 de luni");
});
