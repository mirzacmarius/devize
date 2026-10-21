"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { counties } from "@/lib/counties";
import { initials } from "@/lib/initials";
import { isValidCui } from "@/lib/validation";
import { useScopedI18n } from "@/locales/client";

type FirmDetails = FunctionReturnType<typeof api.accounts.organizations.get>;

// What the backend takes as a logo (see accounts/organizations.ts setLogo).
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// A settings card's footer: a hint on the left, the card's action on the right.
const footer = "justify-between gap-4 border-t bg-sunken py-3";

/**
 * The Firmă's logo and the details its devize, offers and official forms
 * print. Members see them; owners and admins change them.
 */
export function FirmSettings() {
  const { firm } = useFirm();
  const details = useQuery(api.accounts.organizations.get, {
    organizationId: firm._id,
  });
  if (!details) {
    return null;
  }
  const canEdit = details.role === "owner" || details.role === "admin";
  return (
    <>
      <LogoCard firm={details} canEdit={canEdit} />
      {/* A new form for another firm. */}
      <DetailsForm key={details._id} firm={details} canEdit={canEdit} />
    </>
  );
}

function LogoCard({ firm, canEdit }: { firm: FirmDetails; canEdit: boolean }) {
  const t = useScopedI18n("settings.firm");
  const generateUploadUrl = useMutation(api.accounts.files.generateUploadUrl);
  const setLogo = useMutation(api.accounts.organizations.setLogo);
  const run = useRun();
  const [busy, setBusy] = useState(false);
  const inputId = "firm-logo-file";

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!LOGO_TYPES.includes(file.type) || file.size > MAX_LOGO_BYTES) {
      toast.error(t("logoTooBig"));
      return;
    }
    setBusy(true);
    await run(async () => {
      const response = await fetch(
        await generateUploadUrl({ organizationId: firm._id }),
        { method: "POST", headers: { "Content-Type": file.type }, body: file },
      );
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      await setLogo({ organizationId: firm._id, storageId });
    }, t("logoSaved"));
    setBusy(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-start">
        <div className="grid gap-1">
          <CardTitle>{t("logoTitle")}</CardTitle>
          <CardDescription>{t("logoDescription")}</CardDescription>
        </div>
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-card">
          {firm.logoUrl ? (
            <img
              src={firm.logoUrl}
              alt={t("logoAlt", { firm: firm.name })}
              className="size-full object-contain p-1.5"
            />
          ) : (
            <span
              aria-hidden
              className="text-[22px] font-semibold tracking-[0.02em] text-ink-3"
            >
              {initials(firm.name)}
            </span>
          )}
        </div>
      </CardHeader>
      {canEdit && (
        <CardFooter className={footer}>
          <p className="m-0 text-meta text-ink-3">{t("logoHint")}</p>
          <div className="flex shrink-0 gap-2">
            {firm.logoUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      setLogo({ organizationId: firm._id, storageId: null }),
                    t("logoRemoved"),
                  )
                }
              >
                {t("removeLogo")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => document.getElementById(inputId)?.click()}
            >
              {busy && <Icons.Loader className="animate-spin" aria-hidden />}
              {firm.logoUrl ? t("changeLogo") : t("uploadLogo")}
            </Button>
            <input
              id={inputId}
              type="file"
              accept={LOGO_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={upload}
            />
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

function DetailsForm({
  firm,
  canEdit,
}: {
  firm: FirmDetails;
  canEdit: boolean;
}) {
  const t = useScopedI18n("settings.firm");
  const tFirm = useScopedI18n("firm");
  const tc = useScopedI18n("common");
  const update = useMutation(api.accounts.organizations.update);
  const run = useRun();
  const [name, setName] = useState(firm.name);
  const [cui, setCui] = useState(firm.cui ?? "");
  const [tradeRegister, setTradeRegister] = useState(firm.tradeRegister ?? "");
  const [address, setAddress] = useState(firm.address ?? "");
  const [county, setCounty] = useState(firm.county ?? "");
  const [email, setEmail] = useState(firm.email ?? "");
  const [phone, setPhone] = useState(firm.phone ?? "");
  const [vatPayer, setVatPayer] = useState(firm.vatPayer);
  const [errors, setErrors] = useState<{
    name?: string;
    cui?: string;
    email?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : tFirm("nameRequired"),
      cui: cui.trim() && !isValidCui(cui) ? tFirm("cuiInvalid") : undefined,
      email:
        email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
          ? t("emailInvalid")
          : undefined,
    };
    setErrors(found);
    const fix = found.name
      ? "firm-name"
      : found.cui
        ? "firm-cui"
        : found.email && "firm-email";
    if (fix) {
      document.getElementById(fix)?.focus();
      return;
    }
    setSaving(true);
    // An empty field clears what was saved.
    await run(
      () =>
        update({
          organizationId: firm._id,
          name: name.trim(),
          cui: cui.trim(),
          tradeRegister: tradeRegister.trim(),
          address: address.trim(),
          county,
          email: email.trim(),
          phone: phone.trim(),
          vatPayer,
        }),
      t("saved"),
    );
    setSaving(false);
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={submit} noValidate>
        <CardHeader className="grid justify-stretch gap-1">
          <CardTitle>{t("detailsTitle")}</CardTitle>
          <CardDescription>{t("detailsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!canEdit} className="m-0 grid gap-5 border-0 p-0">
            <Field
              label={tFirm("name")}
              htmlFor="firm-name"
              error={errors.name}
            >
              <Input
                id="firm-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={tFirm("namePlaceholder")}
                autoComplete="organization"
                maxLength={200}
                aria-invalid={errors.name !== undefined}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={tFirm("cui")} htmlFor="firm-cui" error={errors.cui}>
                <Input
                  id="firm-cui"
                  value={cui}
                  onChange={(event) => setCui(event.target.value)}
                  placeholder={tFirm("cuiPlaceholder")}
                  inputMode="numeric"
                  className="font-mono"
                  aria-invalid={errors.cui !== undefined}
                />
              </Field>
              <Field label={t("tradeRegister")} htmlFor="firm-trade-register">
                <Input
                  id="firm-trade-register"
                  value={tradeRegister}
                  onChange={(event) => setTradeRegister(event.target.value)}
                  placeholder={t("tradeRegisterPlaceholder")}
                  className="font-mono"
                  maxLength={50}
                />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
              <Field label={t("address")} htmlFor="firm-address">
                <Input
                  id="firm-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={t("addressPlaceholder")}
                  autoComplete="street-address"
                  maxLength={500}
                />
              </Field>
              <Field label={tFirm("county")} htmlFor="firm-county">
                <Select value={county} onValueChange={setCounty}>
                  <SelectTrigger id="firm-county">
                    <SelectValue placeholder={tFirm("countyPlaceholder")} />
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
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("email")}
                htmlFor="firm-email"
                error={errors.email}
              >
                <Input
                  id="firm-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("emailPlaceholder")}
                  autoComplete="email"
                  maxLength={200}
                  aria-invalid={errors.email !== undefined}
                />
              </Field>
              <Field label={t("phone")} htmlFor="firm-phone">
                <Input
                  id="firm-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("phonePlaceholder")}
                  autoComplete="tel"
                  maxLength={50}
                />
              </Field>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card px-4 py-3">
              <div className="grid gap-0.5">
                <label
                  htmlFor="firm-vat"
                  className="text-body font-medium text-ink"
                >
                  {tFirm("vatPayer")}
                </label>
                <p className="m-0 text-meta text-ink-3">
                  {tFirm("vatPayerHint")}
                </p>
              </div>
              <Switch
                id="firm-vat"
                checked={vatPayer}
                onCheckedChange={setVatPayer}
              />
            </div>
          </fieldset>
        </CardContent>
        <CardFooter className={footer}>
          {canEdit ? (
            <>
              <span />
              <Button type="submit" size="sm" disabled={saving}>
                {saving && (
                  <Icons.Loader className="animate-spin" aria-hidden />
                )}
                {tc("save")}
              </Button>
            </>
          ) : (
            <p className="m-0 text-meta text-ink-3">{t("readOnly")}</p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
