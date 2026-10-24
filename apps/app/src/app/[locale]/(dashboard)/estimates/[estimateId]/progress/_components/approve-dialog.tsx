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
import { Input } from "@devize/ui/input";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Statement } from "./types";

/** Records the beneficiary's yes on a statement, and who gave it. */
export function ApproveDialog({
  statement,
  open,
  onClose,
}: {
  statement: Statement;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("progress.approveDialog");
  const tStatement = useScopedI18n("progress.statement");
  const tc = useScopedI18n("common");
  const run = useRun();
  const setStatus = useMutation(api.progress.statements.setStatus);
  const [name, setName] = useState(statement.estimate.client?.name ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await run(
      () =>
        setStatus({
          statementId: statement._id,
          status: "approved",
          approvedBy: name.trim() || undefined,
        }),
      tStatement("approvedToast"),
    );
    setBusy(false);
    if (result.ok) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {t("title", { number: statement.number })}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <Field label={t("name")} htmlFor="approve-name">
            <Input
              id="approve-name"
              value={name}
              placeholder={t("namePlaceholder")}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Icons.Loader className="animate-spin" aria-hidden />}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
