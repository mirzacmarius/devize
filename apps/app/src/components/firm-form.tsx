"use client";

import { TERMS_VERSION } from "@devize/backend/convex/accounts/terms";
import { api } from "@devize/backend/convex/_generated/api";
import type { Doc, Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { Switch } from "@devize/ui/switch";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { counties } from "@/lib/counties";
import { isValidCui } from "@/lib/validation";
import { useScopedI18n } from "@/locales/client";
import { Field } from "./field";
import { LegalLink } from "./legal-link";
import { SegmentedControl } from "./segmented-control";
import { useRun } from "./use-run";

type FirmKind = Doc<"organizations">["kind"];

/**
 * Creates a Firmă: at the firm step after sign-up, and from the firm switcher.
 * Whoever creates it accepts the terms for it, by ticking a box (ADR 0051).
 */
export function FirmForm({
  onCreated,
}: {
  onCreated: (organizationId: Id<"organizations">) => void;
}) {
  const t = useScopedI18n("firm");
  const legal = useScopedI18n("legal");
  const create = useMutation(api.accounts.organizations.create);
  const run = useRun();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FirmKind>("contractor");
  const [cui, setCui] = useState("");
  const [county, setCounty] = useState("");
  const [vatPayer, setVatPayer] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    cui?: string;
    terms?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : t("nameRequired"),
      cui: cui.trim() && !isValidCui(cui) ? t("cuiInvalid") : undefined,
      terms: accepted ? undefined : t("termsRequired"),
    };
    setErrors(found);
    if (found.name || found.cui || found.terms) {
      return;
    }
    setSubmitting(true);
    const result = await run(() =>
      create({
        name: name.trim(),
        kind,
        cui: cui.trim() || undefined,
        county: county || undefined,
        vatPayer,
        termsVersion: TERMS_VERSION,
      }),
    );
    setSubmitting(false);
    if (result.ok) {
      onCreated(result.value);
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field
        label={t("name")}
        htmlFor="firm-name"
        error={errors.name}
        hint={t("nameHint")}
      >
        <Input
          id="firm-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("namePlaceholder")}
          autoComplete="organization"
          aria-invalid={errors.name !== undefined}
          autoFocus
        />
      </Field>
      <Field label={t("kind")} hint={t(`kindHints.${kind}`)}>
        <SegmentedControl
          label={t("kind")}
          value={kind}
          onChange={setKind}
          options={[
            { value: "contractor", label: t("kinds.contractor") },
            { value: "manufacturer", label: t("kinds.manufacturer") },
            { value: "supplier", label: t("kinds.supplier") },
          ]}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("cui")}
          htmlFor="firm-cui"
          error={errors.cui}
          hint={t("cuiHint")}
        >
          <Input
            id="firm-cui"
            value={cui}
            onChange={(event) => setCui(event.target.value)}
            placeholder={t("cuiPlaceholder")}
            inputMode="numeric"
            className="font-mono"
            aria-invalid={errors.cui !== undefined}
          />
        </Field>
        <Field label={t("county")} htmlFor="firm-county">
          <Select value={county} onValueChange={setCounty}>
            <SelectTrigger id="firm-county">
              <SelectValue placeholder={t("countyPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {counties.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card px-4 py-3">
        <div className="grid gap-0.5">
          <label htmlFor="firm-vat" className="text-body font-medium text-ink">
            {t("vatPayer")}
          </label>
          <p className="m-0 text-meta text-ink-3">{t("vatPayerHint")}</p>
        </div>
        <Switch
          id="firm-vat"
          checked={vatPayer}
          onCheckedChange={setVatPayer}
        />
      </div>
      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-body text-ink">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked);
              setErrors({ ...errors, terms: undefined });
            }}
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby="firm-terms-express"
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>
            {t("terms", {
              terms: <LegalLink document="terms" />,
              dpa: <LegalLink document="dpa" />,
            })}
          </span>
        </label>
        <p id="firm-terms-express" className="m-0 pl-7 text-meta text-ink-3">
          {legal("express")}
        </p>
        {errors.terms && (
          <p role="alert" className="m-0 pl-7 text-meta text-danger">
            {errors.terms}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="justify-self-start"
      >
        {submitting && <Icons.Loader className="animate-spin" aria-hidden />}
        {t("create")}
      </Button>
    </form>
  );
}
