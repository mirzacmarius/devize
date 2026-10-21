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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { toast } from "@devize/ui/sonner";
import { Switch } from "@devize/ui/switch";
import { Textarea } from "@devize/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { formatMoney, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { copyText, offerUrl } from "./offer-link";

// How long the client's link works: the choices offered, in days.
const validities = [
  { days: 7, key: "week" },
  { days: 14, key: "twoWeeks" },
  { days: 30, key: "month" },
  { days: 60, key: "twoMonths" },
  { days: 90, key: "threeMonths" },
] as const;

type Optional = { lineItemId: Id<"lineItems">; included: boolean };

/**
 * Makes the client's link for a Deviz: a message, how long it is valid, the
 * deposit asked, the Variante the client chooses between and the works they
 * may leave out. A draft is sent and locked with it.
 */
export function OfferDialog({
  estimate,
  open,
  onClose,
}: {
  estimate: Estimate;
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
        {open && <OfferForm estimate={estimate} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function OfferForm({
  estimate,
  onDone,
}: {
  estimate: Estimate;
  onDone: () => void;
}) {
  const t = useScopedI18n("offer");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const create = useMutation(api.offers.offers.create);
  const variants = useQuery(api.offers.variants.forEstimate, {
    estimateId: estimate._id,
  });
  const errorMessage = useErrorMessage();
  const [message, setMessage] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [deposit, setDeposit] = useState("");
  const [depositError, setDepositError] = useState<string>();
  const [optional, setOptional] = useState<Optional[]>([]);
  const [assistant, setAssistant] = useState(true);
  // Every Variantă goes on the link until the firm unticks one.
  const [left, setLeft] = useState<Id<"variants">[]>([]);
  const offered = (variants?.variants ?? []).filter(
    (variant) => !left.includes(variant._id),
  );
  const [baseLabel, setBaseLabel] = useState<string>();
  const defaultLabel = offered.some(
    (variant) => variant.name === t("variants.tiers.standard"),
  )
    ? t("variants.base")
    : t("variants.tiers.standard");
  const [busy, setBusy] = useState(false);
  const chosen = new Set(optional.map((entry) => entry.lineItemId));
  const titles = new Map(
    estimate.lineItems.map((item) => [item._id, item.title]),
  );

  const createError = (error: unknown) => {
    const appError = appErrorOf(error);
    if (appError?.code === "in_use") {
      return t("errors.inUse");
    }
    if (appError?.code === "invalid") {
      if (appError.detail === "status") {
        return t("errors.status");
      }
      if (appError.detail === "lineItems") {
        return t("errors.empty");
      }
      if (appError.detail === "depositPercent") {
        return t("dialog.depositInvalid");
      }
    }
    return errorMessage(error);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let depositPercent: number | undefined;
    if (deposit.trim()) {
      depositPercent = parseDecimal(deposit);
      if (
        depositPercent === undefined ||
        depositPercent < 1 ||
        depositPercent > 100
      ) {
        setDepositError(t("dialog.depositInvalid"));
        return;
      }
    }
    setDepositError(undefined);
    setBusy(true);
    try {
      const { token } = await create({
        estimateId: estimate._id,
        message: message.trim() || undefined,
        validDays,
        depositPercent,
        optionalItems: optional,
        assistant,
        variantIds: offered.map((variant) => variant._id),
        baseLabel:
          offered.length > 0
            ? (baseLabel ?? defaultLabel).trim() || defaultLabel
            : undefined,
      });
      const copied = await copyText(offerUrl(window.location.origin, token));
      toast.success(
        copied ? t("dialog.created") : t("dialog.createdNotCopied"),
      );
      onDone();
    } catch (error) {
      toast.error(createError(error));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{t("dialog.title")}</DialogTitle>
        <DialogDescription>{t("dialog.description")}</DialogDescription>
      </DialogHeader>
      <Field
        label={t("dialog.message")}
        htmlFor="offer-message"
        hint={t("dialog.messageHint")}
      >
        <Textarea
          id="offer-message"
          value={message}
          maxLength={2000}
          placeholder={t("dialog.messagePlaceholder")}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("dialog.validity")}
          htmlFor="offer-validity"
          hint={t("dialog.validityHint")}
        >
          <Select
            value={String(validDays)}
            onValueChange={(next) => setValidDays(Number(next))}
          >
            <SelectTrigger id="offer-validity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validities.map((validity) => (
                <SelectItem key={validity.days} value={String(validity.days)}>
                  {t(`dialog.validityOptions.${validity.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={t("dialog.deposit")}
          htmlFor="offer-deposit"
          hint={t("dialog.depositHint")}
          error={depositError}
        >
          <DecimalInput
            id="offer-deposit"
            suffix="%"
            value={deposit}
            onChange={(event) => setDeposit(event.target.value)}
          />
        </Field>
      </div>
      {variants && variants.variants.length > 0 && (
        <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
          <legend className="mb-1.5 p-0 text-body font-medium text-ink">
            {t("dialog.variants")}
          </legend>
          <p className="m-0 text-meta text-ink-3">{t("dialog.variantsHint")}</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {variants.variants.map((variant) => (
              <li
                key={variant._id}
                className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-card py-1.5 pl-3 pr-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-body text-ink">
                  {variant.name}
                </span>
                <span className="text-meta tabular-nums text-ink-3">
                  {t("dialog.variantTotal", {
                    total: formatMoney(variant.total, locale),
                  })}
                </span>
                <Switch
                  checked={!left.includes(variant._id)}
                  aria-label={variant.name}
                  onCheckedChange={(on) =>
                    setLeft(
                      on
                        ? left.filter((id) => id !== variant._id)
                        : [...left, variant._id],
                    )
                  }
                />
              </li>
            ))}
          </ul>
          {offered.length > 0 && (
            <Field
              label={t("dialog.baseLabel")}
              htmlFor="offer-base-label"
              hint={t("dialog.baseLabelHint")}
            >
              <Input
                id="offer-base-label"
                value={baseLabel ?? defaultLabel}
                maxLength={40}
                onChange={(event) => setBaseLabel(event.target.value)}
              />
            </Field>
          )}
        </fieldset>
      )}
      <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-body font-medium text-ink">
          {t("dialog.optional")}
        </legend>
        <p className="m-0 text-meta text-ink-3">{t("dialog.optionalHint")}</p>
        {optional.length === 0 ? (
          <p className="m-0 text-meta text-ink-2">{t("dialog.optionalNone")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {optional.map((entry) => {
              const title = titles.get(entry.lineItemId) ?? "";
              return (
                <li
                  key={entry.lineItemId}
                  className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-card py-1.5 pl-3 pr-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    {title}
                  </span>
                  <span className="hidden text-meta text-ink-3 sm:inline">
                    {t("dialog.optionalIncluded")}
                  </span>
                  <Switch
                    checked={entry.included}
                    aria-label={t("dialog.optionalIncludedLabel", { title })}
                    onCheckedChange={(included) =>
                      setOptional(
                        optional.map((other) =>
                          other.lineItemId === entry.lineItemId
                            ? { ...other, included }
                            : other,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t("dialog.optionalRemove", { title })}
                    onClick={() =>
                      setOptional(
                        optional.filter(
                          (other) => other.lineItemId !== entry.lineItemId,
                        ),
                      )
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {estimate.lineItems.length > chosen.size && (
          <Select
            value=""
            onValueChange={(lineItemId) =>
              setOptional([
                ...optional,
                { lineItemId: lineItemId as Id<"lineItems">, included: true },
              ])
            }
          >
            <SelectTrigger aria-label={t("dialog.optionalAdd")}>
              <SelectValue placeholder={t("dialog.optionalAdd")} />
            </SelectTrigger>
            <SelectContent>
              {estimate.lineItems
                .filter((item) => !chosen.has(item._id))
                .map((item) => (
                  <SelectItem key={item._id} value={item._id}>
                    {item.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </fieldset>
      <div className="flex items-start gap-3">
        <Switch
          id="offer-assistant"
          checked={assistant}
          className="mt-0.5"
          onCheckedChange={setAssistant}
        />
        <label
          htmlFor="offer-assistant"
          className="grid cursor-pointer gap-0.5"
        >
          <span className="text-body font-medium text-ink">
            {t("dialog.assistant")}
          </span>
          <span className="text-meta text-ink-3">
            {t("dialog.assistantHint")}
          </span>
        </label>
      </div>
      {estimate.status === "draft" && (
        <p className="m-0 rounded-md border border-border bg-sunken px-3 py-2 text-meta text-ink-2">
          {t("dialog.lockNote")}
        </p>
      )}
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        {/* The Variante load first, so none is left off the link by accident. */}
        <Button type="submit" disabled={busy || variants === undefined}>
          {busy && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("dialog.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
