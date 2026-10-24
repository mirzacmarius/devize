"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button, buttonVariants } from "@devize/ui/button";
import { useMutation } from "convex/react";
import { Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  importTone,
  Panel,
  Pill,
  useErrorText,
  useFormat,
  useRun,
} from "../../../_components/ui";
import type { KeptConsent, NormImport } from "./types";

export function ImportsPanel({
  manufacturerId,
  normImports,
  keptConsents,
}: {
  manufacturerId: Id<"manufacturers">;
  normImports: NormImport[];
  keptConsents: KeptConsent[];
}) {
  const t = useScopedI18n("admin.manufacturer.imports");
  const tAdmin = useScopedI18n("admin");
  const format = useFormat();
  const errorText = useErrorText();
  const generateUploadUrl = useMutation(
    api.manufacturers.normImports.generateUploadUrl,
  );
  const create = useMutation(api.manufacturers.normImports.create);
  const retry = useMutation(api.manufacturers.normImports.retry);
  const remove = useMutation(api.manufacturers.normImports.remove);
  const [uploading, setUploading] = useState(false);
  const { run, error, pending } = useRun();

  const upload = async (file: File) => {
    setUploading(true);
    await run(async () => {
      const response = await fetch(await generateUploadUrl(), {
        method: "POST",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      await create({ manufacturerId, fileId: storageId, fileName: file.name });
    });
    setUploading(false);
  };

  return (
    <Panel
      title={t("title")}
      description={t("description")}
      actions={
        <label
          htmlFor="norms_pdf"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? t("uploading") : t("upload")}
          <input
            id="norms_pdf"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                upload(file);
              }
            }}
          />
        </label>
      }
    >
      <ErrorText error={error} />
      {normImports.length === 0 ? (
        <p className="text-sm text-primary/60">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {normImports.map((normImport) => (
            <li
              key={normImport._id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-primary">
                    {normImport.fileName}
                  </span>
                  <Pill tone={importTone[normImport.status]}>
                    {normImport.status === "extracting" && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {tAdmin(`status.import.${normImport.status}`)}
                  </Pill>
                  {normImport.articlesDone > 0 && !normImport.consent && (
                    <Pill tone="warning">{t("noConsent")}</Pill>
                  )}
                </div>
                <p className="text-xs text-primary/50">
                  {format.date(normImport._creationTime)}
                  {normImport.articles.length > 0 &&
                    ` · ${t("progress", {
                      done: normImport.articlesDone,
                      total: normImport.articles.length,
                    })}`}
                </p>
                {normImport.error && (
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {errorText(normImport.error)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {normImport.articlesDone > 0 && (
                  <Link
                    href={`/admin/manufacturers/${manufacturerId}/imports/${normImport._id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    {t("review")}
                  </Link>
                )}
                {normImport.status === "failed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() => retry({ normImportId: normImport._id }))
                    }
                  >
                    {t("retry")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending || normImport.status === "extracting"}
                  onClick={() =>
                    run(() => remove({ normImportId: normImport._id }))
                  }
                >
                  {t("remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {keptConsents.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium text-primary">{t("kept")}</p>
          <p className="text-xs text-primary/50">{t("keptHint")}</p>
          <ul className="flex flex-col gap-2">
            {keptConsents.map((kept) => (
              <li
                key={`${kept.fileName}-${kept.deletedAt}`}
                className="flex flex-col gap-0.5 text-xs"
              >
                <span className="text-primary/70">
                  {t("keptFile", {
                    file: kept.fileName,
                    date: format.date(kept.deletedAt),
                  })}
                  {kept.edition &&
                    ` · ${t("keptEdition", { edition: kept.edition })}`}
                </span>
                <span className="text-primary">
                  {t("keptConsent", {
                    date: format.date(kept.recordedAt),
                    note: kept.note,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
