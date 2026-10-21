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
