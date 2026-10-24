"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { Textarea } from "@devize/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import {
  formatCalendarDate,
  formatInputNumber,
  formatMoney,
  formatPercent,
  parseDecimal,
  todayInput,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Guarantee } from "./types";

type Stage = "completion" | "final";
type Method = NonNullable<Guarantee["guarantee"]>["method"];

/**
 * The Garanție de bună execuție: its share of the contract, how it is
 * held, what each reception frees and by when, and what came back.
 */
export function GuaranteeCard({ estimateId }: { estimateId: Id<"estimates"> }) {
  const t = useScopedI18n("progress.guarantee");
  const tStages = useScopedI18n("progress.stages");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const guarantee = useQuery(api.progress.guarantees.forEstimate, {
    estimateId,
  });
  const removeRelease = useMutation(api.progress.guarantees.removeRelease);
  const remove = useMutation(api.progress.guarantees.remove);
  const [dialog, setDialog] = useState<"set" | "release" | "remove" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  if (guarantee === undefined) {
    return null;
  }
  const current = guarantee.guarantee;
  const lei = (value: number) => `${formatMoney(value, locale)} lei`;

  const dropRelease = async (index: number) => {
    setBusy(true);
    await run(() => removeRelease({ estimateId, index }), t("releaseRemoved"));
    setBusy(false);
  };

  const dropGuarantee = async () => {
    setBusy(true);
    const result = await run(() => remove({ estimateId }), t("removed"));
    setBusy(false);
    if (result.ok) {
      setDialog(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {current && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tc("actions")}
              >
                <Icons.More aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuItem onSelect={() => setDialog("set")}>
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("release")}>
                {t("release")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onSelect={() => setDialog("remove")}
              >
                {t("remove")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        {current ? (
          <>
            <div className="grid gap-0.5">
              <span className="text-body text-ink">
                {t("percentOf", {
                  percent: formatPercent(current.percent, locale),
                })}
              </span>
              <span className="text-meta text-ink-2">
                {t(`methods.${current.method}`)}
                {current.method === "instrument" && current.instrument
                  ? ` · ${t("instrument", {
                      issuer: current.instrument.issuer,
                      reference: current.instrument.reference,
                    })}${
                      current.instrument.validUntil
                        ? ` · ${t("validUntil", {
                            date: formatCalendarDate(
                              current.instrument.validUntil,
                              locale,
                            ),
                          })}`
                        : ""
                    }`
                  : ""}
              </span>
            </div>
            <dl className="m-0 grid gap-1.5">
              <Line label={t("total")} value={lei(guarantee.total)} />
              {current.method === "retention" && (
                <>
                  <Line label={t("withheld")} value={lei(guarantee.withheld)} />
                  <Line
                    label={t("remainingToWithhold")}
                    value={lei(guarantee.remainingToWithhold)}
                  />
                </>
              )}
            </dl>
            <ul className="m-0 grid list-none gap-2 p-0">
              {(["completion", "final"] as const).map((stage) => {
                const info = guarantee.stages[stage];
                return (
                  <li
                    key={stage}
                    className="grid gap-0.5 rounded-md border border-border bg-sunken px-3 py-2"
                  >
                    <span className="text-body text-ink">
                      {t(`stages.${stage}`)}
                    </span>
                    <span className="text-meta tabular-nums text-ink-2">
                      {t("releasedOf", {
                        released: formatMoney(info.released, locale),
                        amount: formatMoney(info.amount, locale),
                      })}
                      {" · "}
                      {info.dueDate
                        ? t("due", {
                            date: formatCalendarDate(info.dueDate, locale),
                          })
                        : t("waiting")}
                    </span>
                  </li>
                );
              })}
            </ul>
            <dl className="m-0 grid gap-1.5">
              <Line
                label={t("outstanding")}
                value={lei(guarantee.outstanding)}
                strong
              />
            </dl>
            {current.releases.length > 0 && (
              <div className="grid gap-1">
                <span className="text-label uppercase text-ink-3">
                  {t("releases")}
                </span>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {current.releases.map((release, index) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: releases are removed by their place in the list
                      key={index}
                      className="flex items-center justify-between gap-2 text-meta text-ink-2"
                    >
                      <span>
                        {formatCalendarDate(release.date, locale)} ·{" "}
                        {tStages(release.stage)} ·{" "}
                        <span className="tabular-nums text-ink">
                          {lei(release.amount)}
                        </span>
                        {release.note ? ` · ${release.note}` : ""}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 text-ink-3 [&_svg]:size-3.5"
                        disabled={busy}
                        aria-label={t("removeRelease", {
                          date: formatCalendarDate(release.date, locale),
                        })}
                        onClick={() => dropRelease(index)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="m-0 text-body text-ink-2">{t("none")}</p>
            {!guarantee.locked && (
              <Button
                type="button"
                variant="outline"
                className="justify-self-start"
                onClick={() => setDialog("set")}
              >
                {t("set")}
              </Button>
            )}
          </>
        )}
        <p className="m-0 text-meta text-ink-3">{t("hint")}</p>
      </CardContent>
      <GuaranteeDialog
        estimateId={estimateId}
        guarantee={guarantee}
        open={dialog === "set"}
        onClose={() => setDialog(null)}
      />
      <ReleaseDialog
        estimateId={estimateId}
        guarantee={guarantee}
        open={dialog === "release"}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        title={t("removeTitle")}
        description={t("removeDescription")}
        confirm={t("removeConfirm")}
        destructive
        busy={busy}
        onConfirm={dropGuarantee}
      />
    </Card>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "text-body text-ink" : "text-body text-ink-2"}>
        {label}
      </dt>
      <dd
        className={
          strong
            ? "m-0 text-body font-medium tabular-nums text-ink"
            : "m-0 text-body tabular-nums text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/** The guarantee's share and how it is held. */
function GuaranteeDialog({
  estimateId,
  guarantee,
  open,
  onClose,
}: {
  estimateId: Id<"estimates">;
  guarantee: Guarantee;
  open: boolean;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        {open && (
          <GuaranteeForm
            estimateId={estimateId}
            guarantee={guarantee}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuaranteeForm({
  estimateId,
  guarantee,
  onDone,
}: {
  estimateId: Id<"estimates">;
  guarantee: Guarantee;
  onDone: () => void;
}) {
  const t = useScopedI18n("progress.guaranteeDialog");
  const tMethods = useScopedI18n("progress.guarantee.methods");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const set = useMutation(api.progress.guarantees.set);
  const current = guarantee.guarantee;
  const [percent, setPercent] = useState(
    formatInputNumber(current?.percent ?? 5, locale),
  );
  const [method, setMethod] = useState<Method>(current?.method ?? "retention");
  const [issuer, setIssuer] = useState(current?.instrument?.issuer ?? "");
  const [reference, setReference] = useState(
    current?.instrument?.reference ?? "",
  );
  const [amount, setAmount] = useState(
    current?.instrument
      ? formatInputNumber(current.instrument.amount, locale)
      : "",
  );
  const [validUntil, setValidUntil] = useState(
    current?.instrument?.validUntil ?? "",
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const share = parseDecimal(percent);
    if (share === undefined || share < 0 || share > 10) {
      setError(t("invalidPercent"));
      return;
    }
    const sum = amount.trim() ? parseDecimal(amount) : 0;
    if (method === "instrument" && (sum === undefined || sum < 0)) {
      setError(t("invalidAmount"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        set({
          estimateId,
          percent: share,
          method,
          instrument:
            method === "instrument"
              ? {
                  issuer: issuer.trim(),
                  reference: reference.trim(),
                  amount: sum ?? 0,
                  validUntil: validUntil || undefined,
                }
              : undefined,
        }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <Field
        label={t("percent")}
        htmlFor="guarantee-percent"
        hint={t("percentHint")}
        error={error === t("invalidPercent") ? error : undefined}
      >
        <DecimalInput
          id="guarantee-percent"
          suffix="%"
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
          required
        />
      </Field>
      <Field label={t("method")}>
        <SegmentedControl
          label={t("method")}
          value={method}
          options={[
            { value: "retention", label: tMethods("retention") },
            { value: "instrument", label: tMethods("instrument") },
          ]}
          onChange={setMethod}
        />
      </Field>
      {method === "instrument" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("issuer")} htmlFor="guarantee-issuer">
            <Input
              id="guarantee-issuer"
              value={issuer}
              placeholder={t("issuerPlaceholder")}
              maxLength={200}
              onChange={(event) => setIssuer(event.target.value)}
            />
          </Field>
          <Field label={t("reference")} htmlFor="guarantee-reference">
            <Input
              id="guarantee-reference"
              value={reference}
              maxLength={100}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
          <Field
            label={t("amount")}
            htmlFor="guarantee-amount"
            error={error === t("invalidAmount") ? error : undefined}
          >
            <DecimalInput
              id="guarantee-amount"
              suffix="lei"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label={t("validUntil")} htmlFor="guarantee-valid">
            <Input
              id="guarantee-valid"
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </Field>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** A part of the guarantee given back, at one of the two receptions. */
function ReleaseDialog({
  estimateId,
  guarantee,
  open,
  onClose,
}: {
  estimateId: Id<"estimates">;
  guarantee: Guarantee;
  open: boolean;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        {open && (
          <ReleaseForm
            estimateId={estimateId}
            guarantee={guarantee}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReleaseForm({
  estimateId,
  guarantee,
  onDone,
}: {
  estimateId: Id<"estimates">;
  guarantee: Guarantee;
  onDone: () => void;
}) {
  const t = useScopedI18n("progress.releaseDialog");
  const tStages = useScopedI18n("progress.stages");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const release = useMutation(api.progress.guarantees.release);
  // The stage still owed, and what is left of it.
  const owed = (stage: Stage) =>
    Math.max(
      0,
      Math.round(
        (guarantee.stages[stage].amount - guarantee.stages[stage].released) *
          100,
      ) / 100,
    );
  const [stage, setStage] = useState<Stage>(
    owed("completion") > 0 ? "completion" : "final",
  );
  const [amount, setAmount] = useState(() =>
    formatInputNumber(
      owed(owed("completion") > 0 ? "completion" : "final"),
      locale,
    ),
  );
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const pickStage = (next: Stage) => {
    setStage(next);
    setAmount(formatInputNumber(owed(next), locale));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const sum = parseDecimal(amount);
    if (sum === undefined || sum <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        release({
          estimateId,
          stage,
          amount: sum,
          date,
          note: note.trim() || undefined,
        }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <Field label={t("stage")}>
        <SegmentedControl
          label={t("stage")}
          value={stage}
          options={[
            { value: "completion", label: tStages("completion") },
            { value: "final", label: tStages("final") },
          ]}
          onChange={pickStage}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("amount")} htmlFor="release-amount" error={error}>
          <DecimalInput
            id="release-amount"
            suffix="lei"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
        <Field label={t("date")} htmlFor="release-date">
          <Input
            id="release-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
      </div>
      <Field label={t("note")} htmlFor="release-note">
        <Textarea
          id="release-note"
          value={note}
          rows={2}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
