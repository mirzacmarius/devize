import { invalid } from "../lib/errors";

/**
 * A Romanian CUI (cod unic de înregistrare) without the "RO" prefix and spaces,
 * checked against its control digit. Throws `invalid` for a wrong one.
 */
export function cleanCui(value: string): string {
  const digits = value
    .trim()
    .toUpperCase()
    .replace(/^RO/, "")
    .replace(/\s/g, "");
  if (!/^\d{2,10}$/.test(digits)) {
    throw invalid("cui");
  }
  const body = digits.slice(0, -1).padStart(9, "0");
  const key = "753217532";
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(body[i]) * Number(key[i]);
  }
  const control = ((sum * 10) % 11) % 10;
  if (control !== Number(digits.at(-1))) {
    throw invalid("cui");
  }
  return digits;
}

/** An optional text field: trimmed, and undefined when empty. */
export function optionalText(
  value: string | undefined,
  maxLength = 500,
): string | undefined {
  const result = value?.trim();
  if (result && result.length > maxLength) {
    throw invalid("length");
  }
  return result ? result : undefined;
}
