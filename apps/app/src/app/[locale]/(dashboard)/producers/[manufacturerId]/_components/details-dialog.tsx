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
import { Input } from "@devize/ui/input";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { type FormEvent, useId, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Profile } from "./types";

/**
 * What the producer says about itself on its profile: a few lines about the
 * company, its site and who answers technical questions.
 */
export function DetailsDialog({
  profile,
  open,
  onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("producers.detailsDialog");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{t("title", { name: profile.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <DetailsForm profile={profile} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailsForm({
  profile,
  onDone,
}: {
  profile: Profile;
  onDone: () => void;
}) {
  const t = useScopedI18n("producers.detailsDialog");
  const tc = useScopedI18n("common");
  const ids = useId();
  const update = useMutation(api.producers.details.update);
  const run = useRun();
  const [fields, setFields] = useState({
    about: profile.details?.about ?? "",
    website: profile.details?.website ?? "",
    contactName: profile.details?.contactName ?? "",
    contactEmail: profile.details?.contactEmail ?? "",
    contactPhone: profile.details?.contactPhone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await run(
      () => update({ manufacturerId: profile._id, ...fields }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label={t("about")} htmlFor={`${ids}-about`}>
        <Textarea
          id={`${ids}-about`}
          value={fields.about}
          onChange={(event) => set("about")(event.target.value)}
          placeholder={t("aboutPlaceholder")}
          maxLength={1000}
          rows={4}
          autoFocus
        />
      </Field>
      <Field label={t("website")} htmlFor={`${ids}-website`}>
        <Input
          id={`${ids}-website`}
          value={fields.website}
          onChange={(event) => set("website")(event.target.value)}
          placeholder={t("websitePlaceholder")}
          maxLength={200}
          inputMode="url"
          autoComplete="url"
        />
      </Field>
      <Field label={t("contactName")} htmlFor={`${ids}-contact-name`}>
        <Input
          id={`${ids}-contact-name`}
          value={fields.contactName}
          onChange={(event) => set("contactName")(event.target.value)}
          placeholder={t("contactNamePlaceholder")}
          maxLength={100}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("contactEmail")} htmlFor={`${ids}-contact-email`}>
          <Input
            id={`${ids}-contact-email`}
            type="email"
            value={fields.contactEmail}
            onChange={(event) => set("contactEmail")(event.target.value)}
            placeholder={t("contactEmailPlaceholder")}
            maxLength={200}
          />
        </Field>
        <Field label={t("contactPhone")} htmlFor={`${ids}-contact-phone`}>
          <Input
            id={`${ids}-contact-phone`}
            type="tel"
            value={fields.contactPhone}
            onChange={(event) => set("contactPhone")(event.target.value)}
            placeholder={t("contactPhonePlaceholder")}
            maxLength={30}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
