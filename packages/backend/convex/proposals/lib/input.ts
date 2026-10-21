// What a person gives a proposal: a description and photos, or a tender's
// quantity lists. The browser turns phone photos into JPEGs of about 2000 px
// before uploading them, well within what the Claude API takes: these types,
// 5 MB an image, 32 MB a request. The app checks the same limits before
// sending.

export const MAX_TEXT = 5000;

export const photoTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type PhotoType = (typeof photoTypes)[number];

export function isPhotoType(type: string | undefined): type is PhotoType {
  return photoTypes.includes(type as PhotoType);
}

export const MAX_PHOTOS = 8;
// Base64 makes a file a third larger, which must stay under 5 MB.
export const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024;
export const MAX_PHOTOS_BYTES = 20 * 1024 * 1024;

// A tender's lists: spreadsheets (.xlsx), PDFs, with text or scanned, and
// photos of printed pages. A PDF goes to the model whole, as base64, in a
// request of at most 32 MB. The old binary .xls isn't read.
export const MAX_TENDER_FILES = 10;
export const MAX_TENDER_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_TENDER_SHEET_BYTES = 15 * 1024 * 1024;
export const MAX_TENDER_BYTES = 60 * 1024 * 1024;
// Positions one import takes, about as many as a Deviz page shows.
export const MAX_TENDER_ITEMS = 1000;

export const SPREADSHEET_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type TenderFileKind = "spreadsheet" | "pdf" | "image";

/**
 * What kind of list a file is, by its type or else its name: "xls" for the
 * old binary format, null for a file that isn't a list.
 */
export function tenderFileKind(
  name: string,
  contentType: string | undefined,
): TenderFileKind | "xls" | null {
  const lower = name.toLowerCase();
  if (contentType === "application/pdf" || lower.endsWith(".pdf")) {
    return "pdf";
  }
  if (contentType === SPREADSHEET_TYPE || /\.xls[xm]$/.test(lower)) {
    return "spreadsheet";
  }
  if (contentType === "application/vnd.ms-excel" || lower.endsWith(".xls")) {
    return "xls";
  }
  if (isPhotoType(contentType)) {
    return "image";
  }
  return null;
}

/** The largest file of each kind an import takes. */
export const maxTenderFileBytes: Record<TenderFileKind, number> = {
  spreadsheet: MAX_TENDER_SHEET_BYTES,
  pdf: MAX_TENDER_PDF_BYTES,
  image: MAX_PHOTO_BYTES,
};

/** What a file's first bytes say it is, whatever its name. */
export function sniff(
  bytes: Uint8Array,
): "pdf" | "zip" | "ole" | PhotoType | null {
  const starts = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) {
    return "pdf";
  }
  if (starts(0x50, 0x4b, 0x03, 0x04)) {
    return "zip";
  }
  if (starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) {
    return "ole";
  }
  if (starts(0xff, 0xd8, 0xff)) {
    return "image/jpeg";
  }
  if (starts(0x89, 0x50, 0x4e, 0x47)) {
    return "image/png";
  }
  if (starts(0x47, 0x49, 0x46, 0x38)) {
    return "image/gif";
  }
  if (
    starts(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

// The Claude API reads PDFs of at most 100 pages.
export const MAX_PDF_PAGES = 100;

/**
 * A PDF's page count from its page tree, or undefined when the tree is
 * compressed out of sight: the largest /Count of a /Pages node.
 */
export function pdfPageCount(bytes: Uint8Array): number | undefined {
  const text = new TextDecoder("latin1").decode(bytes);
  let count: number | undefined;
  for (const match of text.matchAll(/<<((?:(?!<<|>>)[\s\S]){0,2000})>>/g)) {
    const body = match[1] ?? "";
    if (!/\/Type\s*\/Pages\b/.test(body)) {
      continue;
    }
    const found = Number(/\/Count\s+(\d+)/.exec(body)?.[1]);
    if (Number.isInteger(found) && found > 0) {
      count = Math.max(count ?? 0, found);
    }
  }
  return count;
}
