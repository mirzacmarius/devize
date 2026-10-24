"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Badge } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Switch } from "@devize/ui/switch";
import { Textarea } from "@devize/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { formatInputNumber, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

type Settings = FunctionReturnType<typeof api.invoices.settings.get>;
type Series = Settings["series"][number];

// A settings card's footer: a hint on the left, the card's action on the right.
const footer = "justify-between gap-4 border-t bg-sunken py-3";

/**
 * How the Firmă invoices: the details every invoice prints, the series its
 * invoices are numbered in, and where it stands with e-Factura.
 */
export function BillingSettings() {
  const { firm } = useFirm();
  const settings = useQuery(api.invoices.settings.get, {
    organizationId: firm._id,
  });
  if (!settings) {
    return null;
  }
  return (
    <>
      <DetailsForm key={firm._id} settings={settings} />
      <SeriesCard settings={settings} />
      <EfacturaCard />
    </>
  );
}

function DetailsForm({ settings }: { settings: Settings }) {
  const t = useScopedI18n("settings.billing");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const run = useRun();
  const save = useMutation(api.invoices.settings.save);
  const [iban, setIban] = useState(settings.iban ?? "");
  const [bank, setBank] = useState(settings.bank ?? "");
  const [shareCapital, setShareCapital] = useState(
    settings.shareCapital === null
      ? ""
      : formatInputNumber(settings.shareCapital, locale),
  );
  const [city, setCity] = useState(settings.city ?? "");
  const [postalCode, setPostalCode] = useState(settings.postalCode ?? "");
  const [paymentTermDays, setPaymentTermDays] = useState(
    String(settings.paymentTermDays),
  );
  const [vatOnCollection, setVatOnCollection] = useState(
    settings.vatOnCollection,
  );
  const [footerText, setFooterText] = useState(settings.footer ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const capital = shareCapital.trim() ? parseDecimal(shareCapital) : null;
    const days = Number.parseInt(paymentTermDays, 10);
    await run(
      () =>
        save({
          organizationId: firm._id,
          iban: iban.trim(),
          bank: bank.trim(),
          shareCapital: capital === undefined ? Number.NaN : capital,
          city: city.trim(),
          postalCode: postalCode.trim(),
          paymentTermDays: Number.isNaN(days) ? -1 : days,
          vatOnCollection,
          footer: footerText.trim(),
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
          <fieldset
            disabled={!settings.canEdit}
            className="m-0 grid gap-5 border-0 p-0"
          >
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
              <Field label={t("iban")} htmlFor="billing-iban">
                <Input
                  id="billing-iban"
                  value={iban}
                  onChange={(event) => setIban(event.target.value)}
                  placeholder={t("ibanPlaceholder")}
                  className="font-mono"
                  maxLength={40}
                />
              </Field>
              <Field label={t("bank")} htmlFor="billing-bank">
                <Input
                  id="billing-bank"
                  value={bank}
                  onChange={(event) => setBank(event.target.value)}
                  placeholder={t("bankPlaceholder")}
                  maxLength={100}
                />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field
                label={t("shareCapital")}
                htmlFor="billing-share-capital"
                hint={t("shareCapitalHint")}
              >
                <DecimalInput
                  id="billing-share-capital"
                  value={shareCapital}
                  onChange={(event) => setShareCapital(event.target.value)}
                />
              </Field>
              <Field
                label={t("city")}
                htmlFor="billing-city"
                hint={t("cityHint")}
              >
                <Input
                  id="billing-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  maxLength={50}
                />
              </Field>
              <Field label={t("postalCode")} htmlFor="billing-postal-code">
                <Input
                  id="billing-postal-code"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={20}
                />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
              <Field
                label={t("paymentTermDays")}
                htmlFor="billing-term"
                hint={t("paymentTermHint")}
              >
                <Input
                  id="billing-term"
                  type="number"
                  min={0}
                  max={365}
                  value={paymentTermDays}
                  onChange={(event) => setPaymentTermDays(event.target.value)}
                  className="text-right tabular-nums"
                />
              </Field>
              <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card px-4 py-3">
                <div className="grid gap-0.5">
                  <label
                    htmlFor="billing-vat-collection"
                    className="text-body font-medium text-ink"
                  >
                    {t("vatOnCollection")}
                  </label>
                  <p className="m-0 text-meta text-ink-3">
                    {t("vatOnCollectionHint")}
                  </p>
                </div>
                <Switch
                  id="billing-vat-collection"
                  checked={vatOnCollection}
                  onCheckedChange={setVatOnCollection}
                />
              </div>
            </div>
            <Field
              label={t("footer")}
              htmlFor="billing-footer"
              hint={t("footerHint")}
            >
              <Textarea
                id="billing-footer"
                value={footerText}
                onChange={(event) => setFooterText(event.target.value)}
                rows={3}
                maxLength={1000}
              />
            </Field>
          </fieldset>
        </CardContent>
        <CardFooter className={footer}>
          {settings.canEdit ? (
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

/** The series invoices are numbered in, each with the number the next one gets. */
function SeriesCard({ settings }: { settings: Settings }) {
  const t = useScopedI18n("settings.billing");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const run = useRun();
  const addSeries = useMutation(api.invoices.settings.addSeries);
  const updateSeries = useMutation(api.invoices.settings.updateSeries);
  const removeSeries = useMutation(api.invoices.settings.removeSeries);
  const [code, setCode] = useState("");
  const [start, setStart] = useState("1");
  const [adding, setAdding] = useState(false);
  const [renumbering, setRenumbering] = useState<Series | null>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const nextNumber = Number.parseInt(start, 10);
    setAdding(true);
    const result = await run(
      () =>
        addSeries({
          organizationId: firm._id,
          code: code.trim(),
          nextNumber: Number.isNaN(nextNumber) ? undefined : nextNumber,
        }),
      t("seriesAdded", { code: code.trim().toUpperCase() }),
    );
    setAdding(false);
    if (result.ok) {
      setCode("");
      setStart("1");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("seriesTitle")}</CardTitle>
        <CardDescription>{t("seriesDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {settings.series.length === 0 ? (
          <p className="m-0 text-body text-ink-3">{t("seriesEmpty")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {settings.series.map((series) => (
              <li
                key={series._id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-mono text-body font-medium text-ink">
                    {series.code}
                  </span>
                  <span className="text-meta text-ink-3 tabular-nums">
                    {t("nextIs", { number: series.nextNumber })}
                  </span>
                  {series.isDefault && <Badge>{t("default")}</Badge>}
                  {!series.active && (
                    <Badge tone="warning">{t("inactive")}</Badge>
                  )}
                </div>
                {settings.canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tc("actions")}
                      >
                        <Icons.More aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-56">
                      {!series.isDefault && series.active && (
                        <DropdownMenuItem
                          onSelect={() =>
                            run(
                              () =>
                                updateSeries({
                                  seriesId: series._id,
                                  isDefault: true,
                                }),
                              t("seriesSaved", { code: series.code }),
                            )
                          }
                        >
                          {t("makeDefault")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setRenumbering(series)}>
                        {t("changeNumber")}
                      </DropdownMenuItem>
                      {!series.isDefault && (
                        <DropdownMenuItem
                          onSelect={() =>
                            run(
                              () =>
                                updateSeries({
                                  seriesId: series._id,
                                  active: !series.active,
                                }),
                              t("seriesSaved", { code: series.code }),
                            )
                          }
                        >
                          {series.active ? t("deactivate") : t("activate")}
                        </DropdownMenuItem>
                      )}
                      {!series.isDefault && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-danger focus:text-danger"
                            onSelect={() =>
                              run(
                                () => removeSeries({ seriesId: series._id }),
                                t("seriesRemoved", { code: series.code }),
                              )
                            }
                          >
                            {t("removeSeries")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {settings.canEdit && (
        <CardFooter className={footer}>
          <form
            onSubmit={add}
            noValidate
            className="grid w-full gap-3 sm:grid-cols-[160px_160px_auto] sm:items-end"
          >
            <Field label={t("code")} htmlFor="series-code" hint={t("codeHint")}>
              <Input
                id="series-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder={t("codePlaceholder")}
                className="font-mono uppercase"
                maxLength={10}
              />
            </Field>
            <Field
              label={t("nextNumber")}
              htmlFor="series-start"
              hint={t("nextNumberHint")}
            >
              <Input
                id="series-start"
                type="number"
                min={1}
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className="text-right tabular-nums"
              />
            </Field>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={adding || !code.trim()}
              className="mb-6 sm:mb-0"
            >
              <Plus aria-hidden />
              {t("addSeries")}
            </Button>
          </form>
        </CardFooter>
      )}
      <RenumberDialog
        series={renumbering}
        onClose={() => setRenumbering(null)}
        onSave={(seriesId, nextNumber) =>
          run(
            () => updateSeries({ seriesId, nextNumber }),
            t("seriesSaved", { code: renumbering?.code ?? "" }),
          )
        }
      />
    </Card>
  );
}

function RenumberDialog({
  series,
  onClose,
  onSave,
}: {
  series: Series | null;
  onClose: () => void;
  onSave: (
    seriesId: Series["_id"],
    nextNumber: number,
  ) => Promise<{ ok: boolean }>;
}) {
  const t = useScopedI18n("settings.billing");
  const tc = useScopedI18n("common");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const number = Number.parseInt(value, 10);

  return (
    <Dialog
      open={series !== null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          setValue("");
        }
      }}
    >
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>
            {t("changeNumberTitle", { code: series?.code ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("changeNumberDescription")}</DialogDescription>
        </DialogHeader>
        <Field label={t("nextNumber")} htmlFor="series-next">
          <Input
            id="series-next"
            type="number"
            min={1}
            value={value}
            placeholder={series ? String(series.nextNumber) : ""}
            onChange={(event) => setValue(event.target.value)}
            className="text-right tabular-nums"
          />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button
            disabled={busy || !series || Number.isNaN(number) || number < 1}
            onClick={async () => {
              if (!series) {
                return;
              }
              setBusy(true);
              const result = await onSave(series._id, number);
              setBusy(false);
              if (result.ok) {
                onClose();
                setValue("");
              }
            }}
          >
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Where the firm stands with e-Factura, and what sending from Devize will need. */
function EfacturaCard() {
  const t = useScopedI18n("settings.billing");
  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("efacturaTitle")}</CardTitle>
        <CardDescription>{t("efacturaDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="m-0 text-body text-ink-2">{t("efacturaManual")}</p>
        <p className="m-0 text-meta text-ink-3">{t("efacturaNext")}</p>
      </CardContent>
    </Card>
  );
}
