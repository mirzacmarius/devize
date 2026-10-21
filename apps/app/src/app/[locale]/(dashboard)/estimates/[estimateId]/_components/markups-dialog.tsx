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
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import {
  MarkupsFields,
  parseMarkups,
  useMarkupsDraft,
} from "@/components/markups-fields";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Estimate } from "./types";

/** Changes this Deviz's Cote; the firm's defaults stay as they are. */
export function MarkupsDialog({
  estimate,
  open,
  onClose,
}: {
  estimate: Estimate;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("markups.title")}</DialogTitle>
          <DialogDescription>{t("markups.description")}</DialogDescription>
        </DialogHeader>
        {open && <MarkupsForm estimate={estimate} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function MarkupsForm({
  estimate,
  onDone,
}: {
  estimate: Estimate;
  onDone: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const update = useMutation(api.estimates.estimates.update);
  const firm = useQuery(api.accounts.organizations.get, {
    organizationId: estimate.organizationId,
  });
  const run = useRun();
  const toDraft = useMarkupsDraft();
  const [draft, setDraft] = useState(() => toDraft(estimate.markups));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const markups = parseMarkups(draft);
    if (!markups) {
      setError(t("markups.invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () => update({ estimateId: estimate._id, markups }),
      t("markups.saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  // The firm's defaults, as a new Deviz gets them: no VAT for a firm that
  // doesn't pay it.
  const resetToFirm = () => {
    if (!firm) {
      return;
    }
    setDraft(
      toDraft({
        ...firm.defaultMarkups,
        vat: firm.vatPayer ? firm.defaultMarkups.vat : 0,
      }),
    );
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <MarkupsFields
        value={draft}
        onChange={setDraft}
        idPrefix="estimate-markups"
      />
      {firm && !firm.vatPayer && (
        <p className="m-0 text-meta text-ink-3">{t("markups.notVatPayer")}</p>
      )}
      {error && (
        <p role="alert" className="m-0 text-meta text-danger">
          {error}
        </p>
      )}
      <DialogFooter className="gap-3 sm:items-center sm:justify-between sm:space-x-0">
        <Button
          type="button"
          variant="link"
          disabled={!firm}
          onClick={resetToFirm}
        >
          {t("markups.useFirm")}
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Icons.Loader className="animate-spin" aria-hidden />}
            {tc("save")}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
