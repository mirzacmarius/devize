import { parseDecimal } from "@/lib/format";

// A dimension typed as a sum or a product, "3,2+1,5" or "2*0,9", read as a
// number, so a wall measured in pieces goes in one cell.

type Token =
  | { kind: "number"; value: number }
  | { kind: "op"; value: "+" | "-" | "*" | "/" | "(" | ")" };

function tokenize(input: string): Token[] | undefined {
  const tokens: Token[] = [];
  const text = input.replace(/\s+/g, "").replace(/,/g, ".").replace(/×/g, "*");
  let index = 0;
  while (index < text.length) {
    const char = text[index] ?? "";
    if (/[0-9.]/.test(char)) {
      const match = /^\d*\.?\d+|^\d+\.?/.exec(text.slice(index));
      if (!match) {
        return undefined;
      }
      const value = Number(match[0]);
      if (!Number.isFinite(value)) {
        return undefined;
      }
      tokens.push({ kind: "number", value });
      index += match[0].length;
    } else if (
      char === "+" ||
      char === "-" ||
      char === "*" ||
      char === "/" ||
      char === "(" ||
      char === ")"
    ) {
      tokens.push({ kind: "op", value: char });
      index += 1;
    } else {
      return undefined;
    }
  }
  return tokens;
}

/**
 * Reads "3,2+1,5", "2*(0,9+0,1)" or a plain "42,5" as a number. A plain
 * number keeps its thousands separators; an expression has none. Undefined
 * for anything else.
 */
export function evaluateExpression(input: string): number | undefined {
  const text = input.trim();
  if (!text) {
    return undefined;
  }
  if (!/[+*/()×]|\d-/.test(text)) {
    return parseDecimal(text);
  }
  const tokens = tokenize(text);
  if (!tokens || tokens.length === 0) {
    return undefined;
  }
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  const primary = (): number | undefined => {
    const token = take();
    if (!token) {
      return undefined;
    }
    if (token.kind === "number") {
      return token.value;
    }
    if (token.value === "(") {
      const value = sum();
      const close = take();
      return close?.kind === "op" && close.value === ")" ? value : undefined;
    }
    if (token.value === "-") {
      const value = primary();
      return value === undefined ? undefined : -value;
    }
    return undefined;
  };

  const product = (): number | undefined => {
    let value = primary();
    while (value !== undefined) {
      const token = peek();
      if (
        token?.kind !== "op" ||
        (token.value !== "*" && token.value !== "/")
      ) {
        break;
      }
      take();
      const right = primary();
      if (right === undefined) {
        return undefined;
      }
      value = token.value === "*" ? value * right : value / right;
    }
    return value;
  };

  const sum = (): number | undefined => {
    let value = product();
    while (value !== undefined) {
      const token = peek();
      if (
        token?.kind !== "op" ||
        (token.value !== "+" && token.value !== "-")
      ) {
        break;
      }
      take();
      const right = product();
      if (right === undefined) {
        return undefined;
      }
      value = token.value === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = sum();
  if (result === undefined || position !== tokens.length) {
    return undefined;
  }
  return Number.isFinite(result)
    ? Math.round(result * 10_000) / 10_000
    : undefined;
}
