"use client";

import { api } from "@devize/backend/convex/_generated/api";
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
import { toast } from "@devize/ui/sonner";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useScopedI18n } from "@/locales/client";
import { useOfferError } from "./use-offer-error";

/** Turning an Ofertă down, with a reason for the firm if the client gives one. */
export function DeclineDialog({
  token,
  open,
  onClose,
}: {
  token: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("offerPage.decline");
  const tc = useScopedI18n("common");
  const decline = useMutation(api.offers.public.decline);
  const errorMessage = useOfferError();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await decline({ token, reason: reason.trim() || undefined });
      toast.success(t("done"));
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <Field
            label={t("reason")}
            htmlFor="decline-reason"
            hint={t("reasonHint")}
          >
            <Textarea
              id="decline-reason"
              value={reason}
              maxLength={1000}
              placeholder={t("reasonPlaceholder")}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy && <Icons.Loader className="animate-spin" aria-hidden />}
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
