import type { Align } from "../model";
import { xmlText } from "./text";

// How cells look, as the workbook's styles part lists them: each distinct
// look once, by the number a cell refers to it with.

/** A cell's border on one side: the grid's rules, or the Deviz's lighter ones. */
export type Edge = "rule" | "strong" | "faint" | "ink";

export type Look = {
  // The font: Arial, at this size in points.
  size: number;
  bold?: boolean;
  muted?: boolean;
  fill?: "shade" | "bar";
  border?: Partial<Record<"left" | "right" | "top" | "bottom", Edge>>;
  align?: Align;
  vertical?: "top" | "center";
  // Wrapped to the column's width, or, for a number, made smaller to fit.
  wrap?: boolean;
  shrink?: boolean;
  // A number format, such as #,##0.00.
  format?: string;
};

// The PDF's colours (pdf/writer.ts), as ARGB.
const colors = {
  ink: "FF141414",
  muted: "FF666666",
  rule: "FF404040",
  faint: "FFD1D1D1",
  shade: "FFF0F0F0",
  bar: "FFCCCCCC",
};

const edges: Record<Edge, { style: string; color: string }> = {
  rule: { style: "thin", color: colors.rule },
  strong: { style: "medium", color: colors.rule },
  faint: { style: "thin", color: colors.faint },
  ink: { style: "medium", color: colors.ink },
};

/** The workbook's default text: Arial at 10 points. */
export const defaultSize = 10;

/** The font XML of a look, as a cell's style or a run of text has it. */
export function fontXml(
  font: { size: number; bold?: boolean; muted?: boolean },
  tag: "font" | "rPr" = "font",
): string {
  const name = tag === "font" ? "name" : "rFont";
  return `<${tag}>${font.bold ? "<b/>" : ""}<sz val="${font.size}"/><color rgb="${font.muted ? colors.muted : colors.ink}"/><${name} val="Arial"/><family val="2"/></${tag}>`;
}

/** Numbers each distinct font, fill, border, format and look as it comes. */
export class Styles {
  private readonly fonts = new Map<string, number>();
  private readonly fills = new Map<string, number>([
    ["none", 0],
    ["gray125", 1],
  ]);
  private readonly borders = new Map<string, number>([["", 0]]);
  private readonly formats = new Map<string, number>();
  private readonly looks = new Map<string, number>();
  private readonly xfs: string[] = [];

  constructor() {
    this.id({ size: defaultSize });
  }

  private font(look: Look): number {
    return add(this.fonts, fontXml(look));
  }

  private fill(look: Look): number {
    return look.fill ? add(this.fills, look.fill) : 0;
  }

  private border(look: Look): number {
    const sides = (["left", "right", "top", "bottom"] as const).map((side) => {
      const edge = look.border?.[side];
      return edge
        ? `<${side} style="${edges[edge].style}"><color rgb="${edges[edge].color}"/></${side}>`
        : `<${side}/>`;
    });
    const xml = sides.join("");
    return look.border && xml.includes("style=") ? add(this.borders, xml) : 0;
  }

  private format(look: Look): number {
    return look.format ? 164 + add(this.formats, look.format) : 0;
  }

  /** The number a cell with this look refers to. */
  id(look: Look): number {
    const font = this.font(look);
    const fill = this.fill(look);
    const border = this.border(look);
    const format = this.format(look);
    const alignment = [
      look.align && `horizontal="${look.align}"`,
      look.vertical && `vertical="${look.vertical}"`,
      look.wrap && 'wrapText="1"',
      look.shrink && 'shrinkToFit="1"',
    ]
      .filter(Boolean)
      .join(" ");
    const xml = `<xf numFmtId="${format}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"${font ? ' applyFont="1"' : ""}${fill ? ' applyFill="1"' : ""}${border ? ' applyBorder="1"' : ""}${format ? ' applyNumberFormat="1"' : ""}${alignment ? ` applyAlignment="1"><alignment ${alignment}/></xf>` : "/>"}`;
    const known = this.looks.get(xml);
    if (known !== undefined) {
      return known;
    }
    this.looks.set(xml, this.xfs.length);
    this.xfs.push(xml);
    return this.xfs.length - 1;
  }

  /** The styles part. */
  xml(): string {
    const formats = [...this.formats.keys()].map(
      (code, index) =>
        `<numFmt numFmtId="${164 + index}" formatCode="${xmlText(code)}"/>`,
    );
    const fills = [...this.fills.keys()].map((fill) =>
      fill === "none" || fill === "gray125"
        ? `<fill><patternFill patternType="${fill}"/></fill>`
        : `<fill><patternFill patternType="solid"><fgColor rgb="${colors[fill as "shade" | "bar"]}"/><bgColor indexed="64"/></patternFill></fill>`,
    );
    const borders = [...this.borders.keys()].map((xml) =>
      xml
        ? `<border>${xml}<diagonal/></border>`
        : "<border><left/><right/><top/><bottom/><diagonal/></border>",
    );
    return [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
      formats.length > 0
        ? `<numFmts count="${formats.length}">${formats.join("")}</numFmts>`
        : "",
      `<fonts count="${this.fonts.size}">${[...this.fonts.keys()].join("")}</fonts>`,
      `<fills count="${fills.length}">${fills.join("")}</fills>`,
      `<borders count="${borders.length}">${borders.join("")}</borders>`,
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
      `<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>`,
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
      "</styleSheet>",
    ].join("");
  }
}

/** A key's number in a registry, added at the end the first time. */
function add(registry: Map<string, number>, key: string): number {
  const known = registry.get(key);
  if (known !== undefined) {
    return known;
  }
  registry.set(key, registry.size);
  return registry.size - 1;
}

/**
 * The format that shows a number as the PDF prints it, with as many
 * decimals as its text: 1.615,00 or 0,035. Excel writes the separators of
 * the computer it runs on.
 */
export function numberFormat(text: string): string {
  const decimals = /,(\d+)\D*$/.exec(text)?.[1]?.length ?? 0;
  return decimals > 0 ? `#,##0.${"0".repeat(decimals)}` : "#,##0";
}
