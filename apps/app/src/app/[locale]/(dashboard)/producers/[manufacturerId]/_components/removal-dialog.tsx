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
import type { Profile } from "./types";

/** Asks Devize to take a profile down, saying why. */
export function RemovalDialog({
  profile,
  open,
  onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("producers.removalDialog");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{t("title", { name: profile.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <RemovalForm profile={profile} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RemovalForm({
  profile,
  onDone,
}: {
  profile: Profile;
  onDone: () => void;
}) {
  const t = useScopedI18n("producers.removalDialog");
  const tc = useScopedI18n("common");
  const requestRemoval = useMutation(api.producers.claims.requestRemoval);
  const run = useRun();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError(t("messageRequired"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        requestRemoval({
          manufacturerId: profile._id,
          message: message.trim(),
        }),
      t("sent"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label={t("message")} htmlFor="removal-message" error={error}>
        <Textarea
          id="removal-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("messagePlaceholder")}
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
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
