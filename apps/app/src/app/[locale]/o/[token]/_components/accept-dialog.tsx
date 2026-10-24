"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { checkSignaturePath } from "@devize/backend/convex/offers/signature";
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
import { toast } from "@devize/ui/sonner";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { SignaturePad } from "@/components/signature/signature-pad";
import {
  type Stroke,
  signaturePath,
} from "@/components/signature/signature-path";
import { useScopedI18n } from "@/locales/client";
import { useAddress } from "./address";
import { ChoiceSummary } from "./answer-card";
import type { Choice, OpenOfferView } from "./types";
import { useOfferError } from "./use-offer-error";

/**
 * Accepting an Ofertă: the client checks what they accept, writes their name
 * and signs in the box, or signs with their name alone when they can't draw.
 */
export function AcceptDialog({
  token,
  offer,
  choice,
  open,
  onClose,
}: {
  token: string;
  offer: OpenOfferView;
  choice: Choice;
  open: boolean;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        closeLabel={tc("close")}
        className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
      >
        {open && (
          <AcceptForm
            token={token}
            offer={offer}
            choice={choice}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Errors = { name?: string; signature?: string; consent?: string };

// How much of each piece of evidence the server keeps (offers/consumer.ts).
const limits = {
  userAgent: 300,
  language: 35,
  timeZone: 64,
  screen: 32,
  address: 64,
};

/** What the browser says about itself, kept with the signature as evidence. */
function signingEvidence(address: string | undefined) {
  const cut = (value: string | undefined, max: number) =>
    value ? value.slice(0, max) : undefined;
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }
  return {
    userAgent: cut(navigator.userAgent, limits.userAgent),
    language: cut(navigator.language, limits.language),
    timeZone: cut(timeZone, limits.timeZone),
    screen: cut(
      `${window.screen.width}×${window.screen.height}`,
      limits.screen,
    ),
    address: cut(address, limits.address),
  };
}

function AcceptForm({
  token,
  offer,
  choice,
  onDone,
}: {
  token: string;
  offer: OpenOfferView;
  choice: Choice;
  onDone: () => void;
}) {
  const t = useScopedI18n("offerPage.accept");
  const tc = useScopedI18n("common");
  const accept = useMutation(api.offers.public.accept);
  const errorMessage = useOfferError();
  const address = useAddress();
  const [name, setName] = useState(offer.client?.name ?? "");
  // A consumer may ask for the works to start within the withdrawal days.
  const [earlyStart, setEarlyStart] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  // Signing with the typed name alone, for whoever can't draw.
  const [typed, setTyped] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Errors = {};
    const signer = name.trim().replace(/\s+/g, " ");
    if (signer.length < 2) {
      found.name = t("nameInvalid");
    }
    let signature: string | undefined;
    if (!typed) {
      signature = signaturePath(strokes);
      try {
        checkSignaturePath(signature);
      } catch {
        found.signature = t("signatureMissing");
      }
    }
    if (!consent) {
      found.consent = t("consentMissing");
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setBusy(true);
    try {
      await accept({
        token,
        ...choice,
        name: signer,
        signature,
        evidence: signingEvidence(address),
        earlyStart: offer.consumer ? earlyStart : undefined,
      });
      toast.success(t("done", { firm: offer.firm.name }));
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>
          {typed ? t("descriptionTyped") : t("description")}
        </DialogDescription>
      </DialogHeader>
      <ChoiceSummary offer={offer} choice={choice} />
      <Field
        label={t("name")}
        htmlFor="accept-name"
        hint={t("nameHint")}
        error={errors.name}
      >
        <Input
          id="accept-name"
          autoComplete="name"
          value={name}
          maxLength={120}
          aria-invalid={errors.name ? true : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setErrors({ ...errors, name: undefined });
          }}
        />
      </Field>
      {typed ? (
        <div className="grid gap-1.5">
          <p className="m-0 text-meta text-ink-2">{t("typedHint")}</p>
          <Button
            type="button"
            variant="link"
            className="justify-self-start text-meta"
            onClick={() => setTyped(false)}
          >
            {t("drawInstead")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-1">
          <Field label={t("signature")} error={errors.signature}>
            <SignaturePad
              label={t("signatureArea")}
              placeholder={t("signaturePlaceholder")}
              strokes={strokes}
              onChange={(next) => {
                setStrokes(next);
                setErrors({ ...errors, signature: undefined });
              }}
              invalid={errors.signature !== undefined}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="link"
              className="text-meta"
              onClick={() => setTyped(true)}
            >
              {t("cannotDraw")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={strokes.length === 0}
              onClick={() => setStrokes([])}
            >
              {t("clear")}
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-body text-ink">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              setErrors({ ...errors, consent: undefined });
            }}
            aria-invalid={errors.consent ? true : undefined}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          {t("consent")}
        </label>
        {errors.consent && (
          <p role="alert" className="m-0 text-meta text-danger">
            {errors.consent}
          </p>
        )}
      </div>
      {offer.consumer && (
        <div className="grid gap-2 rounded-md border border-border bg-sunken px-4 py-3">
          <p className="m-0 text-meta text-ink-2">{t("consumerNote")}</p>
          <label className="flex items-start gap-3 text-meta text-ink">
            <input
              type="checkbox"
              checked={earlyStart}
              onChange={(event) => setEarlyStart(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            {t("earlyStart")}
          </label>
        </div>
      )}
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
