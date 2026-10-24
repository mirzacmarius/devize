"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
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
import { useAction, useMutation } from "convex/react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { counties } from "@/lib/counties";
import { isValidCui } from "@/lib/validation";
import { useScopedI18n } from "@/locales/client";
import type { Invoice } from "./types";

type Buyer = Invoice["buyer"];
type Kind = Buyer["kind"];

/** The client as the invoice names them: a form on a draft, a card once issued. */
export function BuyerCard({ invoice }: { invoice: Invoice }) {
  return invoice.status === "draft" ? (
    <BuyerForm invoice={invoice} />
  ) : (
    <BuyerDetails buyer={invoice.buyer} />
  );
}

/** "CIF RO2816464", "CUI 2816464" or "CNP …", as the invoice prints it. */
function identifier(buyer: Buyer): string | undefined {
  if (!buyer.cui) {
    return undefined;
  }
  if (buyer.kind === "person") {
    return `CNP ${buyer.cui}`;
  }
  return buyer.vatRegistered ? `CIF RO${buyer.cui}` : `CUI ${buyer.cui}`;
}

function BuyerDetails({ buyer }: { buyer: Buyer }) {
  const t = useScopedI18n("invoices.buyer");
  const tc = useScopedI18n("common");
  const rows: { label: string; value: ReactNode }[] = [
    { label: t("kind"), value: t(`kinds.${buyer.kind}`) },
    {
      label: buyer.kind === "person" ? t("cnp") : t("cui"),
      value: identifier(buyer),
    },
    ...(buyer.kind === "company"
      ? [{ label: t("tradeRegister"), value: buyer.tradeRegister }]
      : []),
    {
      label: t("address"),
      value: [buyer.address, buyer.postalCode, buyer.city, buyer.county]
        .filter(Boolean)
        .join(", "),
    },
    { label: t("email"), value: buyer.email },
    { label: t("phone"), value: buyer.phone },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <p className="m-0 text-body font-medium text-ink">
          {buyer.name || (
            <span className="font-normal text-ink-3">{tc("notSet")}</span>
          )}
        </p>
        <dl className="m-0 grid gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-w-0 items-baseline justify-between gap-4"
            >
              <dt className="shrink-0 text-body text-ink-3">{row.label}</dt>
              <dd className="m-0 min-w-0 text-right text-body text-ink [overflow-wrap:anywhere]">
                {row.value || (
                  <span className="text-ink-3">{tc("notSet")}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

type Form = {
  name: string;
  kind: Kind;
  cui: string;
  vatRegistered: boolean;
  tradeRegister: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  email: string;
  phone: string;
};

function fromBuyer(buyer: Buyer): Form {
  return {
    name: buyer.name,
    kind: buyer.kind,
    cui: buyer.cui ?? "",
    vatRegistered: buyer.vatRegistered,
    tradeRegister: buyer.tradeRegister ?? "",
    address: buyer.address ?? "",
    city: buyer.city ?? "",
    county: buyer.county ?? "",
    postalCode: buyer.postalCode ?? "",
    email: buyer.email ?? "",
    phone: buyer.phone ?? "",
  };
}

/** The draft's client, corrected here, or looked up in ANAF's register by CUI. */
function BuyerForm({ invoice }: { invoice: Invoice }) {
  const t = useScopedI18n("invoices.buyer");
  const tc = useScopedI18n("common");
  const run = useRun();
  const update = useMutation(api.invoices.invoices.update);
  const checkBuyer = useAction(api.invoices.anaf.checkBuyerNow);
  // Nothing typed yet: the form follows the invoice as the server has it, so
  // what the ANAF lookup wrote shows up here.
  const [edits, setEdits] = useState<Form | null>(null);
  const form = edits ?? fromBuyer(invoice.buyer);
  const [errors, setErrors] = useState<{ name?: string; cui?: string }>({});
  const [busy, setBusy] = useState<"save" | "anaf" | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setEdits({ ...form, [key]: value });
  const company = form.kind === "company";

  const validate = () => {
    const found = {
      name: form.name.trim() ? undefined : t("nameRequired"),
      cui:
        company && form.cui.trim() && !isValidCui(form.cui)
          ? t("cuiInvalid")
          : undefined,
    };
    setErrors(found);
    return !found.name && !found.cui;
  };

  const save = async () => {
    const result = await run(() =>
      update({
        invoiceId: invoice._id,
        buyer: {
          name: form.name.trim(),
          kind: form.kind,
          cui: form.cui.trim(),
          vatRegistered: company ? form.vatRegistered : false,
          tradeRegister: company ? form.tradeRegister.trim() : "",
          address: form.address.trim(),
          city: form.city.trim(),
          county: form.county,
          postalCode: form.postalCode.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
      }),
    );
    if (result.ok) {
      setEdits(null);
    }
    return result.ok;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    setBusy("save");
    if (await save()) {
      toast.success(t("saved"));
    }
    setBusy(null);
  };

  // The lookup reads the CUI the server has, so the form is saved first.
  const askAnaf = async () => {
    if (!validate()) {
      return;
    }
    setBusy("anaf");
    if (edits === null || (await save())) {
      const result = await run(() => checkBuyer({ invoiceId: invoice._id }));
      if (result.ok) {
        const { outcome, name, vatPayer } = result.value;
        if (outcome === "found") {
          toast.success(
            t("anafFound", {
              name: name ?? "",
              vat: t(vatPayer ? "anafVatYes" : "anafVatNo"),
            }),
          );
        } else if (outcome === "not_found") {
          toast.error(t("anafNotFound"));
        } else {
          toast.error(t("anafUnavailable"));
        }
      }
    }
    setBusy(null);
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={submit} noValidate>
        <CardHeader className="grid justify-stretch gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <TickRule />
        <CardContent className="pt-4">
          <fieldset
            disabled={busy !== null}
            className="m-0 grid gap-4 border-0 p-0"
          >
            <Field label={t("name")} htmlFor="buyer-name" error={errors.name}>
              <Input
                id="buyer-name"
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                maxLength={200}
                aria-invalid={errors.name !== undefined}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("kind")} htmlFor="buyer-kind">
                <Select
                  value={form.kind}
                  onValueChange={(value) => set("kind", value as Kind)}
                >
                  <SelectTrigger id="buyer-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">
                      {t("kinds.company")}
                    </SelectItem>
                    <SelectItem value="person">{t("kinds.person")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label={company ? t("cui") : t("cnp")}
                htmlFor="buyer-cui"
                hint={company ? undefined : t("cnpHint")}
                error={errors.cui}
              >
                <Input
                  id="buyer-cui"
                  value={form.cui}
                  onChange={(event) => set("cui", event.target.value)}
                  inputMode="numeric"
                  className="font-mono"
                  maxLength={20}
                  aria-invalid={errors.cui !== undefined}
                />
              </Field>
            </div>
            {company && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("tradeRegister")}
                  htmlFor="buyer-trade-register"
                >
                  <Input
                    id="buyer-trade-register"
                    value={form.tradeRegister}
                    onChange={(event) =>
                      set("tradeRegister", event.target.value)
                    }
                    className="font-mono"
                    maxLength={50}
                  />
                </Field>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-card px-3 py-2">
                  <label
                    htmlFor="buyer-vat"
                    className="text-body font-medium text-ink"
                  >
                    {t("vatRegistered")}
                  </label>
                  <Switch
                    id="buyer-vat"
                    checked={form.vatRegistered}
                    onCheckedChange={(checked) => set("vatRegistered", checked)}
                  />
                </div>
              </div>
            )}
            <Field label={t("address")} htmlFor="buyer-address">
              <Input
                id="buyer-address"
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
                autoComplete="street-address"
                maxLength={150}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field
                label={t("city")}
                htmlFor="buyer-city"
                hint={t("cityHint")}
              >
                <Input
                  id="buyer-city"
                  value={form.city}
                  onChange={(event) => set("city", event.target.value)}
                  maxLength={50}
                />
              </Field>
              <Field label={t("county")} htmlFor="buyer-county">
                <Select
                  value={form.county}
                  onValueChange={(value) => set("county", value)}
                >
                  <SelectTrigger id="buyer-county">
                    <SelectValue placeholder={t("countyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {counties.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("postalCode")} htmlFor="buyer-postal-code">
                <Input
                  id="buyer-postal-code"
                  value={form.postalCode}
                  onChange={(event) => set("postalCode", event.target.value)}
                  inputMode="numeric"
                  maxLength={20}
                />
              </Field>
              <Field label={t("email")} htmlFor="buyer-email">
                <Input
                  id="buyer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                  maxLength={200}
                />
              </Field>
              <Field label={t("phone")} htmlFor="buyer-phone">
                <Input
                  id="buyer-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  maxLength={50}
                />
              </Field>
            </div>
          </fieldset>
        </CardContent>
        <CardFooter className="justify-between gap-4 border-t bg-sunken py-3">
          {company ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy !== null || !form.cui.trim()}
              onClick={askAnaf}
            >
              {busy === "anaf" && (
                <Icons.Loader className="animate-spin" aria-hidden />
              )}
              {t("checkAnaf")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="sm" disabled={busy !== null}>
            {busy === "save" && (
              <Icons.Loader className="animate-spin" aria-hidden />
            )}
            {tc("save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
