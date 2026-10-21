"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  MAX_PHOTOS,
  MAX_TEXT,
} from "@devize/backend/convex/proposals/lib/input";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Label } from "@devize/ui/label";
import { toast } from "@devize/ui/sonner";
import { Textarea } from "@devize/ui/textarea";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { ImagePlus, Mic, Square, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Field } from "@/components/field";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { shrinkPhoto, uploadBlob } from "./photos";
import { useDictation } from "./use-dictation";
import { useProposalError } from "./use-proposal-error";

type Photo = {
  key: string;
  name: string;
  preview: string | null;
  status: "uploading" | "ready" | "failed";
  fileId?: Id<"files">;
  // Uploaded here, so removing it deletes the file too.
  fresh: boolean;
};

/** What the form starts with when a proposal is tried again with changes. */
export type DescribeInitial = {
  text?: string;
  photos: { _id: Id<"files">; name: string; url: string | null }[];
};

/**
 * The work as the contractor tells it: typed or dictated, with photos. The
 * photos are shrunk in the browser and uploaded as the Deviz's files while
 * the description is still being written.
 */
export function DescribeForm({
  estimate,
  initial,
  onStarted,
}: {
  estimate: Estimate;
  initial?: DescribeInitial;
  onStarted: () => void;
}) {
  const t = useScopedI18n("proposal");
  const locale = useCurrentLocale();
  const generateUploadUrl = useMutation(api.accounts.files.generateUploadUrl);
  const register = useMutation(api.accounts.files.register);
  const removeFile = useMutation(api.accounts.files.remove);
  const start = useMutation(api.proposals.proposals.start);
  const proposalError = useProposalError();
  const [text, setText] = useState(initial?.text ?? "");
  const [photos, setPhotos] = useState<Photo[]>(
    () =>
      initial?.photos.map((photo) => ({
        key: photo._id,
        name: photo.name,
        preview: photo.url,
        status: "ready" as const,
        fileId: photo._id,
        fresh: false,
      })) ?? [],
  );
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);
  const dictation = useDictation(
    locale === "ro" ? "ro-RO" : "en-GB",
    (phrase) =>
      setText((current) =>
        current.trim() ? `${current.trimEnd()} ${phrase}` : phrase,
      ),
  );

  // Object URLs hold the photos in memory until they are let go.
  useEffect(
    () => () => {
      for (const url of previews.current) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  const setPhoto = (key: string, fields: Partial<Photo>) =>
    setPhotos((current) =>
      current.map((photo) =>
        photo.key === key ? { ...photo, ...fields } : photo,
      ),
    );

  const upload = async (key: string, file: File) => {
    let shrunk: Blob;
    try {
      shrunk = await shrinkPhoto(file);
    } catch {
      setPhoto(key, { status: "failed" });
      toast.error(t("describe.unreadable", { name: file.name }));
      return;
    }
    try {
      const storageId = await uploadBlob(
        await generateUploadUrl({ organizationId: estimate.organizationId }),
        shrunk,
      );
      const fileId = await register({
        organizationId: estimate.organizationId,
        storageId: storageId as Id<"_storage">,
        name: file.name,
        purpose: "photo",
        estimateId: estimate._id,
      });
      setPhoto(key, { status: "ready", fileId });
    } catch {
      setPhoto(key, { status: "failed" });
      toast.error(t("describe.uploadFailed", { name: file.name }));
    }
  };

  const addPhotos = (files: File[]) => {
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) {
      toast.error(t("describe.tooManyPhotos", { max: MAX_PHOTOS }));
    }
    for (const file of files.slice(0, Math.max(room, 0))) {
      const key = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      setPhotos((current) => [
        ...current,
        { key, name: file.name, preview, status: "uploading", fresh: true },
      ]);
      void upload(key, file);
    }
  };

  const removePhoto = (photo: Photo) => {
    setPhotos((current) => current.filter((item) => item.key !== photo.key));
    if (photo.fresh && photo.fileId) {
      void removeFile({ fileId: photo.fileId }).catch(() => undefined);
    }
  };

  const uploading = photos.some((photo) => photo.status === "uploading");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    dictation.stop();
    const description = text.trim();
    const fileIds = photos.flatMap((photo) =>
      photo.status === "ready" && photo.fileId ? [photo.fileId] : [],
    );
    if (!description && fileIds.length === 0) {
      setError(t("describe.required"));
      return;
    }
    if (description.length > MAX_TEXT) {
      setError(t("describe.tooLong", { max: MAX_TEXT }));
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await start({
        estimateId: estimate._id,
        text: description || undefined,
        fileIds,
      });
      onStarted();
    } catch (failure) {
      toast.error(proposalError(failure));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field
        label={t("describe.label")}
        htmlFor="proposal-text"
        hint={t("describe.hint")}
        error={error}
      >
        <Textarea
          id="proposal-text"
          rows={7}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("describe.placeholder")}
          aria-invalid={error !== undefined}
          autoFocus
        />
      </Field>
      {dictation.supported && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={dictation.listening ? "secondary" : "outline"}
            size="sm"
            aria-pressed={dictation.listening}
            onClick={dictation.listening ? dictation.stop : dictation.start}
          >
            {dictation.listening ? <Square aria-hidden /> : <Mic aria-hidden />}
            {dictation.listening
              ? t("describe.stopDictation")
              : t("describe.dictate")}
          </Button>
          {dictation.listening && (
            <span role="status" className="min-w-0 text-meta text-ink-3">
              {dictation.interim || t("describe.listening")}
            </span>
          )}
          {dictation.failed && (
            <span role="alert" className="text-meta text-danger">
              {t("describe.dictationFailed")}
            </span>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="proposal-photos">{t("describe.photos")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={photos.length >= MAX_PHOTOS}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus aria-hidden />
            {t("describe.addPhotos")}
          </Button>
          <input
            ref={fileInput}
            id="proposal-photos"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              addPhotos(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
        <p className="m-0 text-meta text-ink-3">
          {t("describe.photosHint", { max: MAX_PHOTOS })}
        </p>
        {photos.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
            {photos.map((photo) => (
              <li
                key={photo.key}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md border bg-sunken",
                  photo.status === "failed"
                    ? "border-danger-border"
                    : "border-border",
                )}
              >
                {photo.preview && (
                  <img
                    src={photo.preview}
                    alt={photo.name}
                    className="size-full object-cover"
                  />
                )}
                {photo.status === "uploading" && (
                  <span className="absolute inset-0 grid place-items-center bg-black/30">
                    <Icons.Loader
                      className="size-5 animate-spin text-white"
                      aria-hidden
                    />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(photo)}
                  aria-label={t("describe.removePhoto", { name: photo.name })}
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="m-0 text-meta text-ink-3">{t("describe.privacy")}</p>
      <Button
        type="submit"
        className="justify-self-end"
        disabled={submitting || uploading}
      >
        {submitting || uploading ? (
          <Icons.Loader className="animate-spin" aria-hidden />
        ) : (
          <Icons.AI aria-hidden />
        )}
        {uploading ? t("describe.uploading") : t("describe.submit")}
      </Button>
    </form>
  );
}
