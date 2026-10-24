"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
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
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import type { Statement } from "./types";

/**
 * Starts a Situație de lucrări for a period, or changes the period and
 * the date of the open one.
 */
export function StatementDialog({
  estimateId,
  statement,
  open,
  defaultPeriodStart,
  onClose,
  onCreated,
}: {
  estimateId: Id<"estimates">;
  // The statement to change; a new one when left out.
  statement?: Statement;
  open: boolean;
  defaultPeriodStart?: string;
  onClose: () => void;
  onCreated?: (statementId: Id<"workStatements">) => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        {open && (
          <StatementForm
            estimateId={estimateId}
            statement={statement}
            defaultPeriodStart={defaultPeriodStart}
            onDone={onClose}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatementForm({
  estimateId,
  statement,
  defaultPeriodStart,
  onDone,
  onCreated,
}: {
  estimateId: Id<"estimates">;
  statement?: Statement;
  defaultPeriodStart?: string;
  onDone: () => void;
  onCreated?: (statementId: Id<"workStatements">) => void;
}) {
  const t = useScopedI18n("progress.statementDialog");
  const tc = useScopedI18n("common");
  const create = useMutation(api.progress.statements.create);
  const update = useMutation(api.progress.statements.update);
  const run = useRun();
  const today = todayInput();
  const [periodStart, setPeriodStart] = useState(
    statement?.periodStart ?? defaultPeriodStart ?? today,
  );
  const [periodEnd, setPeriodEnd] = useState(statement?.periodEnd ?? today);
  const [date, setDate] = useState(statement?.date ?? today);
  const [notes, setNotes] = useState(statement?.notes ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!periodStart || !periodEnd || !date) {
      setError(t("invalidDate"));
      return;
    }
    if (periodStart > periodEnd) {
      setError(t("invalidPeriod"));
      return;
    }
    setError(undefined);
    setSaving(true);
    if (statement) {
      const result = await run(
        () =>
          update({
            statementId: statement._id,
            periodStart,
            periodEnd,
            date,
            notes: notes.trim(),
          }),
        t("saved"),
      );
      setSaving(false);
      if (result.ok) {
        onDone();
      }
      return;
    }
    const result = await run(() =>
      create({
        estimateId,
        periodStart,
        periodEnd,
        date,
        notes: notes.trim() || undefined,
      }),
    );
    setSaving(false);
    if (result.ok) {
      onCreated?.(result.value);
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{statement ? t("editTitle") : t("newTitle")}</DialogTitle>
        <DialogDescription>
          {statement ? t("editDescription") : t("newDescription")}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("periodStart")} htmlFor="statement-start">
          <Input
            id="statement-start"
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            required
          />
        </Field>
        <Field label={t("periodEnd")} htmlFor="statement-end" error={error}>
          <Input
            id="statement-end"
            type="date"
            value={periodEnd}
            min={periodStart || undefined}
            onChange={(event) => setPeriodEnd(event.target.value)}
            required
          />
        </Field>
        <Field label={t("date")} htmlFor="statement-date">
          <Input
            id="statement-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
      </div>
      <Field label={t("notes")} htmlFor="statement-notes">
        <Textarea
          id="statement-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={2000}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {statement ? t("save") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
