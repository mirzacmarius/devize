"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  isPdfFile,
  MAX_DATASHEET_BYTES,
  MAX_DATASHEET_WORK,
} from "@devize/backend/convex/producers/lib/datasheetFile";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { Label } from "@devize/ui/label";
import { toast } from "@devize/ui/sonner";
import { Textarea } from "@devize/ui/textarea";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { File as FileIcon, FileUp, X } from "lucide-react";
import { type DragEvent, type FormEvent, useId, useRef, useState } from "react";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { formatFileSize } from "@/lib/format";
import { uploadBlob } from "@/lib/upload";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

const MB = 1024 * 1024;

/**
 * A product's technical data sheet, for Devize AI to draft one of the
 * producer's norms from. The PDF is uploaded as one of the firm's files,
 * then read in the background; the profile shows how the reading goes and
 * the draft it makes.
 */
export function DatasheetDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("producers.datasheet");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <DatasheetForm onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DatasheetForm({ onDone }: { onDone: () => void }) {
  const t = useScopedI18n("producers.datasheet");
  const tc = useScopedI18n("common");
  const ids = useId();
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const generateUploadUrl = useMutation(api.accounts.files.generateUploadUrl);
  const register = useMutation(api.accounts.files.register);
  const removeFile = useMutation(api.accounts.files.remove);
  const start = useMutation(api.producers.datasheets.start);
  const errorMessage = useErrorMessage();
  const [file, setFile] = useState<File | null>(null);
  const [work, setWork] = useState("");
  const [error, setError] = useState<string>();
  const [step, setStep] = useState<"uploading" | "starting" | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const choose = (chosen: File | undefined) => {
    if (!chosen) {
      return;
    }
    if (!isPdfFile(chosen.name, chosen.type || undefined)) {
      setError(t("notPdf", { name: chosen.name }));
      return;
    }
    if (chosen.size > MAX_DATASHEET_BYTES) {
      setError(t("tooBig", { max: MAX_DATASHEET_BYTES / MB }));
      return;
    }
    setError(undefined);
    setFile(chosen);
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  };

  // What the server refuses that the form couldn't check itself.
  const startError = (failure: unknown) => {
    const appError = appErrorOf(failure);
    if (appError?.code === "rate_limited") {
      return t("errors.rateLimited");
    }
    if (appError?.code === "forbidden" && appError.detail === "manufacturer") {
      return t("errors.notProducer");
    }
    return errorMessage(failure);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError(t("required"));
      return;
    }
    setStep("uploading");
    let fileId: Id<"files">;
    try {
      const storageId = await uploadBlob(
        await generateUploadUrl({ organizationId: firm._id }),
        file,
      );
      fileId = await register({
        organizationId: firm._id,
        storageId: storageId as Id<"_storage">,
        name: file.name,
        purpose: "datasheet",
      });
    } catch {
      toast.error(t("uploadFailed", { name: file.name }));
      setStep(null);
      return;
    }
    setStep("starting");
    try {
      await start({ organizationId: firm._id, fileId, work });
    } catch (failure) {
      toast.error(startError(failure));
      // Nothing reads the file now, so it doesn't stay among the firm's.
      void removeFile({ fileId }).catch(() => undefined);
      setStep(null);
      return;
    }
    toast.success(t("started"));
    onDone();
  };

  const busy = step !== null;

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor={`${ids}-file`}>{t("file")}</Label>
        <input
          ref={fileInput}
          id={`${ids}-file`}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {file ? (
          <div className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-card py-1.5 pl-3 pr-1.5">
            <FileIcon className="size-4 shrink-0 text-ink-3" aria-hidden />
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-body text-ink">{file.name}</span>
              <span className="text-meta tabular-nums text-ink-3">
                {formatFileSize(file.size, locale)}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={t("remove", { name: file.name })}
              disabled={busy}
              onClick={() => setFile(null)}
            >
              <X aria-hidden />
            </Button>
          </div>
        ) : (
          // The PDF can also be dropped here from a folder.
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
            className={cn(
              "grid justify-items-center gap-1 rounded-md border border-dashed px-4 py-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dragging
                ? "border-ai-border bg-ai-soft"
                : "border-border hover:bg-tile",
              error && "border-danger-border",
            )}
          >
            <FileUp className="size-5 text-ink-3" aria-hidden />
            <span className="text-body font-medium text-ink">
              {t("choose")}
            </span>
            <span className="text-meta text-ink-3">
              {t("chooseHint", { max: MAX_DATASHEET_BYTES / MB })}
            </span>
          </button>
        )}
        {error && (
          <p role="alert" className="m-0 text-meta text-danger">
            {error}
          </p>
        )}
      </div>
      <Field label={t("work")} htmlFor={`${ids}-work`} hint={t("workHint")}>
        <Textarea
          id={`${ids}-work`}
          value={work}
          onChange={(event) => setWork(event.target.value)}
          placeholder={t("workPlaceholder")}
          maxLength={MAX_DATASHEET_WORK}
          rows={2}
        />
      </Field>
      <p className="m-0 text-meta text-ink-3">{t("privacy")}</p>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" disabled={busy} onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <Icons.Loader className="animate-spin" aria-hidden />
          ) : (
            <Icons.AI aria-hidden />
          )}
          {step === "uploading"
            ? t("uploading")
            : step === "starting"
              ? t("starting")
              : t("submit")}
        </Button>
      </div>
    </form>
  );
}
