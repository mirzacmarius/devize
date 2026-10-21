"use client";

// Phone photos are large: 4000 px and several MB. The AI reads up to about
// 2000 px, so each photo is redrawn as a JPEG of at most that size, turned
// the way the camera held it, before it is uploaded.
const MAX_SIDE = 2048;
const QUALITY = 0.85;

/** The photo as a JPEG at most 2048 px wide or high. Throws if the browser can't read it. */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("No 2D canvas");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No JPEG"))),
      "image/jpeg",
      QUALITY,
    ),
  );
}

/** Uploads a file to Convex storage and returns its storage id. */
export async function uploadBlob(uploadUrl: string, blob: Blob) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
  const { storageId } = (await response.json()) as { storageId: string };
  return storageId;
}
