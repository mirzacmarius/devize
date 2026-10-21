"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

/**
 * Sends a norm in review back to its author as a draft, with a note on what
 * to change. For the Devize staff who verify public norms.
 */
export function RejectDialog({
  norm,
  open,
  onClose,
}: {
  norm: Norm;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("norm");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>
            {t("rejectDialog.title", { code: norm.code })}
          </DialogTitle>
          <DialogDescription>{t("rejectDialog.description")}</DialogDescription>
        </DialogHeader>
        {open && <RejectForm norm={norm} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RejectForm({ norm, onDone }: { norm: Norm; onDone: () => void }) {
  const t = useScopedI18n("norm");
  const tc = useScopedI18n("common");
  const reject = useMutation(api.catalog.norms.reject);
  const run = useRun();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) {
      setError(t("rejectDialog.noteRequired"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () => reject({ normId: norm._id, note: note.trim() }),
      t("actions.rejected"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label={t("rejectDialog.note")} htmlFor="reject-note" error={error}>
        <Textarea
          id="reject-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("rejectDialog.notePlaceholder")}
          maxLength={1000}
          rows={4}
          aria-invalid={error !== undefined}
          autoFocus
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" variant="destructive" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("rejectDialog.confirm")}
        </Button>
      </div>
    </form>
  );
}
