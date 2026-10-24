"use client";

import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { Textarea } from "@devize/ui/textarea";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useScopedI18n } from "@/locales/client";

export type TemplateFields = { name: string; description?: string };

/** A Șablon's name and what it is for: to save a Deviz as one, or rename one. */
export function TemplateDialog({
  open,
  onOpenChange,
  title,
  description,
  submit,
  initial,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submit: string;
  initial: TemplateFields;
  busy: boolean;
  onSubmit: (fields: TemplateFields) => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && (
          <TemplateForm
            initial={initial}
            submit={submit}
            busy={busy}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateForm({
  initial,
  submit,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: TemplateFields;
  submit: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (fields: TemplateFields) => void;
}) {
  const t = useScopedI18n("templates.save");
  const te = useScopedI18n("errors");
  const tc = useScopedI18n("common");
  const [name, setName] = useState(initial.name);
  const [details, setDetails] = useState(initial.description ?? "");
  const [error, setError] = useState<string>();

  const send = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = name.trim();
    if (!cleaned || cleaned.length > 120) {
      setError(te("invalidTemplateName"));
      return;
    }
    setError(undefined);
    onSubmit({ name: cleaned, description: details.trim() || undefined });
  };

  return (
    <form className="grid gap-5" onSubmit={send} noValidate>
      <Field label={t("name")} htmlFor="template-name" error={error}>
        <Input
          id="template-name"
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={error !== undefined}
          autoFocus
        />
      </Field>
      <Field
        label={t("details")}
        htmlFor="template-details"
        hint={t("detailsHint")}
      >
        <Textarea
          id="template-details"
          value={details}
          maxLength={1000}
          rows={3}
          onChange={(event) => setDetails(event.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Icons.Loader className="animate-spin" aria-hidden />}
          {submit}
        </Button>
      </DialogFooter>
    </form>
  );
}
