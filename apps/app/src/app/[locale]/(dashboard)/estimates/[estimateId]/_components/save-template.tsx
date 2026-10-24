"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { toast } from "@devize/ui/sonner";
import { useMutation } from "convex/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { useScopedI18n } from "@/locales/client";
import {
  TemplateDialog,
  type TemplateFields,
} from "../../_components/template-dialog";
import type { Estimate } from "./types";

/**
 * Saves the Deviz as a Șablon. A name the firm already uses asks first,
 * then replaces that Șablon.
 */
export function SaveTemplateDialog({
  estimate,
  open,
  onOpenChange,
}: {
  estimate: Estimate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useScopedI18n("templates.save");
  const save = useMutation(api.templates.templates.save);
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState(false);
  // What was typed, kept while the firm decides to replace a Șablon.
  const [draft, setDraft] = useState<TemplateFields>();
  const [confirming, setConfirming] = useState(false);

  const send = async (fields: TemplateFields, replace = false) => {
    setBusy(true);
    try {
      await save({ estimateId: estimate._id, ...fields, replace });
      toast.success(t("saved", { name: fields.name }));
      setConfirming(false);
      setDraft(undefined);
      onOpenChange(false);
    } catch (error) {
      const appError = appErrorOf(error);
      if (
        !replace &&
        appError?.code === "in_use" &&
        appError.detail === "templateName"
      ) {
        setDraft(fields);
        setConfirming(true);
      } else {
        toast.error(errorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TemplateDialog
        open={open && !confirming}
        onOpenChange={(next) => {
          if (!next) {
            setDraft(undefined);
          }
          onOpenChange(next);
        }}
        title={t("title")}
        description={t("description")}
        submit={t("submit")}
        initial={draft ?? { name: estimate.title }}
        busy={busy}
        onSubmit={(fields) => send(fields)}
      />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("replaceTitle", { name: draft?.name ?? "" })}
        description={t("replaceDescription")}
        confirm={t("replace")}
        busy={busy}
        onConfirm={() => draft && send(draft, true)}
      />
    </>
  );
}
