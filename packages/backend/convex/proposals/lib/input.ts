// What a person gives a proposal: a description and photos. The browser
// turns phone photos into JPEGs of about 2000 px before uploading them, well
// within what the Claude API takes: these types, 5 MB an image, 32 MB a
// request. The app checks the same limits before sending.

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
