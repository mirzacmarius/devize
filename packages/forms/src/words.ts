import { formatMoney } from "./format";

// Numbers written out in Romanian, as a tender's offer form asks for its
// price "în litere și în cifre": 1.234,50 lei is "o mie două sute treizeci și
// patru de lei și cincizeci de bani". A number agrees with what it counts
// ("doi lei", "două mii") and takes "de" before it from twenty on, unless it
// ends in 1 to 19: "douăzeci de lei", "o sută de lei", but "o sută doi lei".

/** The gender of what a number counts, which "unu" and "doi" agree with. */
type Gender = "masculine" | "feminine" | "neuter";

// Up to nineteen; 1, 2 and 12 agree with what they count.
const small = [
  "zero",
  "unu",
  "doi",
  "trei",
  "patru",
  "cinci",
  "șase",
  "șapte",
  "opt",
  "nouă",
  "zece",
  "unsprezece",
  "doisprezece",
  "treisprezece",
  "paisprezece",
  "cincisprezece",
  "șaisprezece",
  "șaptesprezece",
  "optsprezece",
  "nouăsprezece",
];
const tens = [
  "",
  "",
  "douăzeci",
  "treizeci",
  "patruzeci",
  "cincizeci",
  "șaizeci",
  "șaptezeci",
  "optzeci",
  "nouăzeci",
];

function belowTwenty(n: number, gender: Gender): string {
  switch (n) {
    case 1:
      return gender === "feminine" ? "una" : "unu";
    case 2:
      return gender === "masculine" ? "doi" : "două";
    case 12:
      return gender === "masculine" ? "doisprezece" : "douăsprezece";
    default:
      return small[n] ?? "";
  }
}

function belowThousand(n: number, gender: Gender): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const words: string[] = [];
  if (hundreds > 0) {
    words.push(
      hundreds === 1 ? "o sută" : `${belowTwenty(hundreds, "feminine")} sute`,
    );
  }
  if (rest >= 20) {
    const ten = tens[Math.floor(rest / 10)] ?? "";
    const unit = rest % 10;
    words.push(unit > 0 ? `${ten} și ${belowTwenty(unit, gender)}` : ten);
  } else if (rest > 0) {
    words.push(belowTwenty(rest, gender));
  }
  return words.join(" ");
}

/** Whether a number takes "de" before what it counts: 20 de lei, 101 lei. */
function takesDe(n: number): boolean {
  const end = n % 100;
  return n >= 20 && (end === 0 || end >= 20);
}

/** A number and what it counts: "un leu", "două mii", "douăzeci de bani". */
function counted(n: number, gender: Gender, one: string, many: string): string {
  if (n === 1) {
    return one;
  }
  return `${numberInWords(n, gender)}${takesDe(n) ? " de " : " "}${many}`;
}

const scales = [
  { size: 1e9, gender: "neuter", one: "un miliard", many: "miliarde" },
  { size: 1e6, gender: "neuter", one: "un milion", many: "milioane" },
  { size: 1e3, gender: "feminine", one: "o mie", many: "mii" },
] as const;

/**
 * A whole number below a trillion in words, agreeing with what it counts:
 * 22 is "douăzeci și doi" lei but "douăzeci și două" de mii.
 */
export function numberInWords(n: number, gender: Gender = "masculine"): string {
  const whole = Math.floor(Math.abs(n));
  if (whole === 0) {
    return "zero";
  }
  const words: string[] = [];
  let rest = whole;
  for (const scale of scales) {
    const count = Math.floor(rest / scale.size);
    rest %= scale.size;
    if (count > 0) {
      words.push(counted(count, scale.gender, scale.one, scale.many));
    }
  }
  if (rest > 0) {
    words.push(belowThousand(rest, gender));
  }
  return words.join(" ");
}

/** Lei and bani in words: "o mie două sute de lei și cincizeci de bani". */
export function leiInWords(amount: number): string {
  const bani = Math.round(Math.abs(amount) * 100);
  const lei = Math.floor(bani / 100);
  const rest = bani % 100;
  const words = [
    lei === 0 ? "zero lei" : counted(lei, "masculine", "un leu", "lei"),
    ...(rest > 0 ? [counted(rest, "masculine", "un ban", "bani")] : []),
  ].join(" și ");
  return amount < 0 && bani > 0 ? `minus ${words}` : words;
}

/** An amount as an offer form writes it: "1.234,50 lei (o mie ... de bani)". */
export function leiInFiguresAndWords(amount: number): string {
  return `${formatMoney(amount)} lei (${leiInWords(amount)})`;
}

/** A count in figures with its noun, as Romanian joins them: 1 lună, 6 luni, 20 de luni. */
export function countOf(n: number, one: string, many: string): string {
  if (n === 1) {
    return `1 ${one}`;
  }
  return `${n}${takesDe(n) ? " de " : " "}${many}`;
}
