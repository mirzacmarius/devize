"use client";

import { type InputHTMLAttributes, useRef } from "react";

/** What Convex storage answers for each uploaded file: its new storage id. */
export type UploadedFile = { storageId: string };

/**
 * A file input that uploads the chosen files to Convex storage, each to a
 * fresh upload URL, then reports their storage ids.
 */
export function UploadInput({
  generateUploadUrl,
  onUploadComplete,
  ...props
}: {
  generateUploadUrl: () => Promise<string>;
  onUploadComplete: (uploaded: UploadedFile[]) => void;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "accept" | "id" | "type" | "className" | "required" | "tabIndex"
>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={fileInputRef}
      type="file"
      onChange={async (event) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) {
          return;
        }
        const uploaded = await Promise.all(
          files.map(async (file) => {
            const response = await fetch(await generateUploadUrl(), {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });
            if (!response.ok) {
              throw new Error(`Upload failed with status ${response.status}`);
            }
            return (await response.json()) as UploadedFile;
          }),
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onUploadComplete(uploaded);
      }}
      {...props}
    />
  );
}
