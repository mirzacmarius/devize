"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  MAX_TENDER_FILES,
  maxTenderFileBytes,
  tenderFileKind,
} from "@devize/backend/convex/proposals/lib/input";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Label } from "@devize/ui/label";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { File as FileIcon, FileUp, X } from "lucide-react";
import { type DragEvent, type FormEvent, useRef, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { shrinkPhoto, uploadBlob } from "./photos";
import { useProposalError } from "./use-proposal-error";

type ListFile = {
  key: string;
  name: string;
  status: "uploading" | "ready" | "failed";
  fileId?: Id<"files">;
  // Uploaded here, so removing it deletes the file too.
  fresh: boolean;
};

/** What the form starts with when an import is tried again with changes. */
export type TenderInitial = { files: { _id: Id<"files">; name: string }[] };

const ACCEPT = [
  ".xlsx",
  ".xlsm",
  ".xls",
  ".pdf",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/*",
].join(",");

const MB = 1024 * 1024;

/**
 * A tender's quantity lists (formularul F3): spreadsheets, PDFs or photos of
 * the pages, uploaded as the Deviz's files as soon as they are chosen. Photos
 * are shrunk in the browser first, like a description's.
 */
export function TenderForm({
  estimate,
  initial,
  onStarted,
}: {
  estimate: Estimate;
  initial?: TenderInitial;
  onStarted: () => void;
}) {
  const t = useScopedI18n("proposal");
  const generateUploadUrl = useMutation(api.accounts.files.generateUploadUrl);
  const register = useMutation(api.accounts.files.register);
  const removeFile = useMutation(api.accounts.files.remove);
  const startTender = useMutation(api.proposals.proposals.startTender);
  const proposalError = useProposalError();
  const [files, setFiles] = useState<ListFile[]>(
    () =>
      initial?.files.map((file) => ({
        key: file._id,
        name: file.name,
        status: "ready" as const,
        fileId: file._id,
        fresh: false,
      })) ?? [],
  );
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const setFile = (key: string, fields: Partial<ListFile>) =>
    setFiles((current) =>
      current.map((file) => (file.key === key ? { ...file, ...fields } : file)),
    );

  const upload = async (key: string, file: File, image: boolean) => {
    let blob: Blob = file;
    if (image) {
      try {
        blob = await shrinkPhoto(file);
      } catch {
        setFile(key, { status: "failed" });
        toast.error(t("tender.unreadablePhoto", { name: file.name }));
        return;
      }
    }
    try {
      const storageId = await uploadBlob(
        await generateUploadUrl({ organizationId: estimate.organizationId }),
        blob,
      );
      const fileId = await register({
        organizationId: estimate.organizationId,
        storageId: storageId as Id<"_storage">,
        name: file.name,
        purpose: "tender",
        estimateId: estimate._id,
      });
      setFile(key, { status: "ready", fileId });
    } catch {
      setFile(key, { status: "failed" });
      toast.error(t("tender.uploadFailed", { name: file.name }));
    }
  };

  const addFiles = (chosen: File[]) => {
    setError(undefined);
    const room = MAX_TENDER_FILES - files.length;
    if (chosen.length > room) {
      toast.error(t("tender.tooMany", { max: MAX_TENDER_FILES }));
    }
    for (const file of chosen.slice(0, Math.max(room, 0))) {
      const kind = tenderFileKind(file.name, file.type || undefined);
      if (kind === "xls") {
        toast.error(t("tender.xls", { name: file.name }));
        continue;
      }
      if (!kind) {
        toast.error(t("tender.unsupported", { name: file.name }));
        continue;
      }
      // A photo is shrunk below the limit; a list must fit as it is.
      if (kind !== "image" && file.size > maxTenderFileBytes[kind]) {
        toast.error(
          t("tender.tooBig", {
            name: file.name,
            max: Math.round(maxTenderFileBytes[kind] / MB),
          }),
        );
        continue;
      }
      const key = crypto.randomUUID();
      setFiles((current) => [
        ...current,
        { key, name: file.name, status: "uploading", fresh: true },
      ]);
      void upload(key, file, kind === "image");
    }
  };

  const remove = (file: ListFile) => {
    setFiles((current) => current.filter((item) => item.key !== file.key));
    if (file.fresh && file.fileId) {
      void removeFile({ fileId: file.fileId }).catch(() => undefined);
    }
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const uploading = files.some((file) => file.status === "uploading");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const fileIds = files.flatMap((file) =>
      file.status === "ready" && file.fileId ? [file.fileId] : [],
    );
    if (fileIds.length === 0) {
      setError(t("tender.required"));
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await startTender({ estimateId: estimate._id, fileIds });
      onStarted();
    } catch (failure) {
      toast.error(proposalError(failure));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <p className="m-0 text-body text-ink-2">{t("tender.description")}</p>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="tender-files">{t("tender.label")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={files.length >= MAX_TENDER_FILES}
            onClick={() => fileInput.current?.click()}
          >
            <FileUp aria-hidden />
            {t("tender.add")}
          </Button>
          <input
            ref={fileInput}
            id="tender-files"
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
        <p className="m-0 text-meta text-ink-3">
          {t("tender.hint", { max: MAX_TENDER_FILES })}
        </p>
        {/* Lists can also be dropped here from a folder. */}
        <ul
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={cn(
            "m-0 grid min-h-16 list-none content-start gap-2 rounded-md border border-dashed p-2",
            dragging ? "border-ai-border bg-ai-soft" : "border-border",
          )}
        >
          {files.map((file) => (
            <li
              key={file.key}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-sm border bg-card py-1 pl-3 pr-1",
                file.status === "failed"
                  ? "border-danger-border"
                  : "border-border",
              )}
            >
              <FileIcon className="size-4 shrink-0 text-ink-3" aria-hidden />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-body",
                  file.status === "failed" ? "text-danger" : "text-ink",
                )}
              >
                {file.name}
              </span>
              {file.status === "uploading" && (
                <Icons.Loader
                  className="size-4 shrink-0 animate-spin text-ink-3"
                  aria-hidden
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t("tender.remove", { name: file.name })}
                onClick={() => remove(file)}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="m-0 text-meta text-danger">
            {error}
          </p>
        )}
      </div>

      <p className="m-0 text-meta text-ink-3">{t("tender.privacy")}</p>
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
        {uploading ? t("tender.uploading") : t("tender.submit")}
      </Button>
    </form>
  );
}
