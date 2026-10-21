import type { Block } from "../model";
import { drawTable } from "./table";
import { wrapText } from "./text";
import { baselineOf, colors, type Writer } from "./writer";

// Every block but tables: the lines naming the parties, titles, letterheads,
// paragraphs and the signatures.

const bodySize = 8.5;

type Of<T extends Block["type"]> = Extract<Block, { type: T }>;

function drawFields(writer: Writer, block: Of<"fields">) {
  const { regular } = writer.fonts;
  const leading = bodySize * 1.35;
  const labelWidth =
    Math.max(
      0,
      ...block.items.map((item) => regular.width(`${item.label}:`, bodySize)),
    ) + 6;
  for (const item of block.items) {
    const lines = wrapText(
      item.value,
      regular,
      bodySize,
      writer.contentWidth - labelWidth,
    );
    writer.fit(lines.length * leading);
    const baseline = baselineOf(writer.y, bodySize, leading);
    writer.text(`${item.label}:`, writer.left, baseline, {
      font: regular,
      size: bodySize,
      color: colors.muted,
    });
    lines.forEach((line, index) => {
      writer.text(line, writer.left + labelWidth, baseline + index * leading, {
        font: regular,
        size: bodySize,
      });
    });
    writer.y += lines.length * leading;
  }
  if (block.items.length > 0) {
    writer.y += 4;
  }
}

function drawTitle(writer: Writer, block: Of<"title">) {
  const { regular, bold } = writer.fonts;
  const width = writer.contentWidth * 0.8;
  const lines = block.lines.flatMap((text, index) => {
    const size = index === 0 ? 12 : index === 1 ? 9.5 : 9;
    const font = index < 2 ? bold : regular;
    const leading = size * 1.4;
    return wrapText(text, font, size, width).map((line) => ({
      line,
      size,
      font,
      leading,
    }));
  });
  const height = lines.reduce((sum, line) => sum + line.leading, 0);
  writer.y += 6;
  // With room for the table that follows, so a title never ends a page.
  writer.fit(height + 60);
  const centre = (writer.left + writer.right) / 2;
  for (const { line, size, font, leading } of lines) {
    writer.text(line, centre, baselineOf(writer.y, size, leading), {
      font,
      size,
      align: "center",
    });
    writer.y += leading;
  }
  writer.y += 6;
}

function drawColumns(writer: Writer, block: Of<"columns">) {
  const gap = 18;
  const count = Math.max(block.columns.length, 1);
  const width = (writer.contentWidth - gap * (count - 1)) / count;
  const laid = block.columns.map((column) => {
    const lines = column.lines.flatMap((part) => {
      const size = part.size ?? bodySize;
      const font = part.bold ? writer.fonts.bold : writer.fonts.regular;
      return wrapText(part.text, font, size, width).map((text) => ({
        text,
        size,
        font,
        leading: size * 1.35,
        color: part.muted ? colors.muted : colors.ink,
      }));
    });
    return {
      align: column.align ?? "left",
      lines,
      height: lines.reduce((sum, line) => sum + line.leading, 0),
    };
  });
  const height = Math.max(0, ...laid.map((column) => column.height));
  writer.fit(height);
  laid.forEach((column, index) => {
    const left = writer.left + index * (width + gap);
    const x =
      column.align === "right"
        ? left + width
        : column.align === "center"
          ? left + width / 2
          : left;
    let y = writer.y;
    for (const line of column.lines) {
      writer.text(line.text, x, baselineOf(y, line.size, line.leading), {
        font: line.font,
        size: line.size,
        color: line.color,
        align: column.align,
      });
      y += line.leading;
    }
  });
  writer.y += height + 4;
}

function drawHeading(writer: Writer, block: Of<"heading">) {
  const size = 10;
  const leading = 14;
  writer.y += 6;
  writer.fit(leading + 40);
  writer.text(block.text, writer.left, baselineOf(writer.y, size, leading), {
    font: writer.fonts.bold,
    size,
  });
  writer.y += leading + 2;
}

function drawText(writer: Writer, block: Of<"text">) {
  const size = block.size ?? bodySize;
  const font = block.bold ? writer.fonts.bold : writer.fonts.regular;
  const leading = size * 1.35;
  const x =
    block.align === "right"
      ? writer.right
      : block.align === "center"
        ? (writer.left + writer.right) / 2
        : writer.left;
  for (const line of wrapText(block.text, font, size, writer.contentWidth)) {
    writer.fit(leading);
    writer.text(line, x, baselineOf(writer.y, size, leading), {
      font,
      size,
      color: block.muted ? colors.muted : colors.ink,
      align: block.align,
    });
    writer.y += leading;
  }
  writer.y += 2;
}

function drawRule(writer: Writer) {
  writer.y += 6;
  writer.fit(8);
  writer.line(writer.left, writer.y, writer.right, writer.y, 0.5, colors.faint);
  writer.y += 8;
}

function laySignatures(writer: Writer, block: Of<"signatures">) {
  const { regular } = writer.fonts;
  const leading = bodySize * 1.35;
  const count = Math.max(block.items.length, 2);
  const width = writer.contentWidth / count;
  const items = block.items.map((item) => ({
    item,
    names: item.name ? wrapText(item.name, regular, bodySize, width - 24) : [],
  }));
  const dateHeight = block.date ? leading + 4 : 0;
  const signHeight = 26;
  const hintHeight = 7 * 1.4;
  const height =
    dateHeight +
    Math.max(
      0,
      ...items.map(({ names }) => leading * (1 + names.length) + signHeight),
    ) +
    hintHeight;
  return { items, width, leading, dateHeight, signHeight, hintHeight, height };
}

function drawSignatures(writer: Writer, block: Of<"signatures">) {
  const { regular, bold } = writer.fonts;
  const laid = laySignatures(writer, block);
  const { leading } = laid;
  writer.fit(laid.height);
  if (block.date) {
    writer.text(
      block.date,
      writer.left,
      baselineOf(writer.y, bodySize, leading),
      {
        font: regular,
        size: bodySize,
      },
    );
  }
  laid.items.forEach(({ item, names }, index) => {
    const x = writer.left + index * laid.width;
    let y = writer.y + laid.dateHeight;
    writer.text(item.role, x, baselineOf(y, bodySize, leading), {
      font: bold,
      size: bodySize,
    });
    y += leading;
    for (const name of names) {
      writer.text(name, x, baselineOf(y, bodySize, leading), {
        font: regular,
        size: bodySize,
      });
      y += leading;
    }
    y += laid.signHeight;
    writer.line(x, y, x + Math.min(160, laid.width - 24), y, 0.5, colors.muted);
    if (item.hint) {
      writer.text(item.hint, x, baselineOf(y + 1, 7, laid.hintHeight), {
        font: regular,
        size: 7,
        color: colors.muted,
      });
    }
  });
  writer.y += laid.height;
}

/**
 * The height of the blocks that close a document after its last table:
 * spaces, notes and signatures, which the table keeps on its last page.
 */
export function closingHeight(writer: Writer, blocks: readonly Block[]) {
  let height = 0;
  for (const block of blocks) {
    if (block.type === "space") {
      height += block.height;
    } else if (block.type === "text") {
      const size = block.size ?? bodySize;
      const font = block.bold ? writer.fonts.bold : writer.fonts.regular;
      height +=
        wrapText(block.text, font, size, writer.contentWidth).length *
          size *
          1.35 +
        2;
    } else if (block.type === "signatures") {
      height += laySignatures(writer, block).height;
    } else {
      break;
    }
  }
  return height;
}

/** Draws a block; `after` is what follows it in the document. */
export function drawBlock(
  writer: Writer,
  block: Block,
  after: readonly Block[] = [],
) {
  switch (block.type) {
    case "table":
      drawTable(writer, block, closingHeight(writer, after));
      return;
    case "fields":
      drawFields(writer, block);
      return;
    case "title":
      drawTitle(writer, block);
      return;
    case "columns":
      drawColumns(writer, block);
      return;
    case "heading":
      drawHeading(writer, block);
      return;
    case "text":
      drawText(writer, block);
      return;
    case "rule":
      drawRule(writer);
      return;
    case "signatures":
      drawSignatures(writer, block);
      return;
    case "space":
      if (!writer.atPageTop) {
        writer.y += block.height;
      }
      return;
  }
}
