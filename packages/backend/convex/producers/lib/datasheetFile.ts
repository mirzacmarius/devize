// What a producer uploads for Devize AI to draft a norm from: a product's
// technical data sheet, as a PDF. The PDF goes to the model whole, as base64,
// in a request of at most 32 MB; a data sheet is a few pages, so 20 MB is
// plenty. The app checks the same limits before uploading.
export const MAX_DATASHEET_BYTES = 20 * 1024 * 1024;
// The work the norm should describe, in the producer's words.
export const MAX_DATASHEET_WORK = 500;

/** Whether a file looks like a PDF, by its type or else its name. */
export function isPdfFile(name: string, contentType: string | undefined) {
  return (
    contentType === "application/pdf" || name.toLowerCase().endsWith(".pdf")
  );
}
