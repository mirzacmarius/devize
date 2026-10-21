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
import { type FormEvent, useState } from "react";
import {
  ClaimFirmSelect,
  chosenFirm,
  type FirmChoice,
  NEW_FIRM,
} from "@/components/claim-firm-select";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Profile } from "./types";

type Method = "domain" | "manual";

/**
 * Claims a profile: at once for an address on one of the producer's domains,
 * otherwise as a request that Devize checks first.
 */
export function ClaimDialog({
  profile,
  open,
  onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("producers.claimDialog");
  const tc = useScopedI18n("common");
  const method = profile.viewer.claimMethod;
  // Claiming takes the method away, so the last one stays while the dialog
  // fades out.
  const [shown, setShown] = useState<Method | null>(method);
  if (method !== null && method !== shown) {
    setShown(method);
  }
  const email = profile.viewer.email ?? "";
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{t("title", { name: profile.name })}</DialogTitle>
          <DialogDescription>
            {shown === "domain"
              ? t("domainDescription", { email })
              : t("manualDescription", { email })}
          </DialogDescription>
        </DialogHeader>
        {open && method && (
          <ClaimForm profile={profile} method={method} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClaimForm({
  profile,
  method,
  onDone,
}: {
  profile: Profile;
  method: Method;
  onDone: () => void;
}) {
  const t = useScopedI18n("producers.claimDialog");
  const tc = useScopedI18n("common");
  const claimWithDomain = useMutation(api.producers.claims.claimWithDomain);
  const request = useMutation(api.producers.claims.request);
  const run = useRun();
  const { firms } = profile.viewer;
  const [firm, setFirm] = useState<FirmChoice>(firms[0]?._id ?? NEW_FIRM);
  const [message, setMessage] = useState("");
  const [cui, setCui] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const organizationId = chosenFirm(firm);
    if (method === "manual" && !message.trim()) {
      setError(t("messageRequired"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result =
      method === "domain"
        ? await run(
            () =>
              claimWithDomain({ manufacturerId: profile._id, organizationId }),
            t("claimed", { name: profile.name }),
          )
        : await run(
            () =>
              request({
                manufacturerId: profile._id,
                message: message.trim(),
                cui: cui.trim() || undefined,
                organizationId,
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
      <ClaimFirmSelect
        id="claim-firm"
        firms={firms}
        value={firm}
        onChange={setFirm}
        label={t("firm")}
        newLabel={t("newFirm", { name: profile.name })}
        hint={t("firmHint")}
      />
      {method === "manual" && (
        <>
          <Field
            label={t("message", { name: profile.name })}
            htmlFor="claim-message"
            error={error}
          >
            <Textarea
              id="claim-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("messagePlaceholder")}
              maxLength={1000}
              rows={4}
              aria-invalid={error !== undefined}
              autoFocus
            />
          </Field>
          <Field label={t("cui")} htmlFor="claim-cui" hint={t("cuiHint")}>
            <Input
              id="claim-cui"
              value={cui}
              onChange={(event) => setCui(event.target.value)}
              placeholder={t("cuiPlaceholder")}
              maxLength={20}
              className="font-mono"
            />
          </Field>
        </>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {method === "domain" ? t("claim") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
