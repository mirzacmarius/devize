import { type Zippable, zipSync } from "fflate";

// Files made in the browser packed into one .zip, such as a firm's archive
// of invoices. It loads with the first use, like the PDF writer.

/**
 * The files in one .zip, by their path inside it. PDFs and workbooks are
 * compressed already, so they go in as they are.
 */
export function zipFiles(files: Readonly<Record<string, Uint8Array>>) {
  const entries: Zippable = {};
  for (const [path, bytes] of Object.entries(files)) {
    entries[path] = /\.(pdf|xlsx|zip)$/i.test(path)
      ? [bytes, { level: 0 }]
      : bytes;
  }
  return zipSync(entries);
}
