"use client";

import { addDays } from "@devize/forms/sheet";
import { Input } from "@devize/ui/input";
import type { ReactNode } from "react";
import { Field } from "@/components/field";
import { formatCalendarDate } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { isValidity, maxValidity } from "./stored-choices";

/** The offer form's blanks as the person types them. */
export type OfferInput = { validity: string; signer: string; role: string };

/** The days typed in, when they are whole days the offer form can print. */
export function validityDays(text: string): number | undefined {
  const days = /^\d+$/.test(text.trim()) ? Number(text.trim()) : undefined;
  return isValidity(days) ? days : undefined;
}

/**
 * The offer form's blanks that no other form fills: how long the offer
 * stays valid, and who signs it for the firm. `children` come first, such as
 * the duration when F6 doesn't ask for it.
 */
export function OfferFields({
  offer,
  deadline,
  onChange,
  children,
}: {
  offer: OfferInput;
  // The tender's deadline, YYYY-MM-DD, which the validity counts from.
  deadline?: string;
  onChange: (offer: OfferInput) => void;
  children?: ReactNode;
}) {
  const t = useScopedI18n("documents.forms.offer");
  const locale = useCurrentLocale();
  const days = validityDays(offer.validity);
  const invalid = offer.validity.trim() !== "" && days === undefined;
  const until = days !== undefined && deadline && addDays(deadline, days);
  const date = (value: string) => formatCalendarDate(value, locale);
  const hint = !deadline
    ? t("validityNoDeadline")
    : until
      ? t("validityUntil", { date: date(until), deadline: date(deadline) })
      : t("validityHint", { deadline: date(deadline) });

  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className="mb-1.5 p-0 text-body font-medium text-ink">
        {t("title")}
      </legend>
      {children}
      <Field
        label={t("validity")}
        htmlFor="forms-validity"
        hint={hint}
        error={invalid ? t("validityInvalid", { max: maxValidity }) : undefined}
      >
        <Input
          id="forms-validity"
          inputMode="numeric"
          className="w-28"
          placeholder="90"
          aria-invalid={invalid || undefined}
          value={offer.validity}
          onChange={(event) =>
            onChange({ ...offer, validity: event.target.value })
          }
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("signer")} htmlFor="forms-signer">
          <Input
            id="forms-signer"
            autoComplete="name"
            value={offer.signer}
            onChange={(event) =>
              onChange({ ...offer, signer: event.target.value })
            }
          />
        </Field>
        <Field label={t("role")} htmlFor="forms-role">
          <Input
            id="forms-role"
            placeholder={t("rolePlaceholder")}
            value={offer.role}
            onChange={(event) =>
              onChange({ ...offer, role: event.target.value })
            }
          />
        </Field>
      </div>
      <p className="m-0 text-meta text-ink-3">{t("signerHint")}</p>
    </fieldset>
  );
}
