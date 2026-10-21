"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { Store } from "@devize/backend/convex/prices/resolve";
import { productPage, storeSites } from "@devize/backend/convex/prices/stores";
import { unitsPerSale } from "@devize/backend/convex/prices/units";
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
import { useMutation, useQuery } from "convex/react";
import { ExternalLink } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import {
  formatInputNumber,
  formatMoney,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { searchUrl } from "./basket-view";
import type { BasketMaterial, BasketPanel } from "./types";

type LinkPanel = Extract<BasketPanel, { kind: "link" | "typed" }>;

/** The material's product or resource, as the price functions take it. */
export function materialArgs(material: BasketMaterial) {
  return material.productId
    ? { productId: material.productId }
    : { resourceId: material.resourceId };
}

/**
 * Adds a store's product for a material: from the link to its page, which
 * Devize reads, or, when the page can't be read, from a price typed by hand.
 */
export function LinkDialog({
  organizationId,
  panel,
  onClose,
  onTypePrice,
}: {
  organizationId: Id<"organizations">;
  panel: LinkPanel | null;
  onClose: () => void;
  onTypePrice: (material: BasketMaterial, store: Store) => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={panel !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-lg">
        {panel?.kind === "link" && (
          <ReadForm
            key={`${panel.material.key}:${panel.store}`}
            organizationId={organizationId}
            material={panel.material}
            store={panel.store}
            onDone={onClose}
            onTypePrice={() => onTypePrice(panel.material, panel.store)}
          />
        )}
        {panel?.kind === "typed" && (
          <TypedForm
            key={`${panel.material.key}:${panel.store}`}
            organizationId={organizationId}
            material={panel.material}
            store={panel.store}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Seconds until a moment, counting down while the dialog is open. */
function useSecondsUntil(at: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === undefined || at <= Date.now()) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [at]);
  return at === undefined ? 0 : Math.max(0, Math.ceil((at - now) / 1000));
}

function ReadForm({
  organizationId,
  material,
  store,
  onDone,
  onTypePrice,
}: {
  organizationId: Id<"organizations">;
  material: BasketMaterial;
  store: Store;
  onDone: () => void;
  onTypePrice: () => void;
}) {
  const t = useScopedI18n("prices.basket.link");
  const tOffer = useScopedI18n("prices.basket.offer");
  const tStores = useScopedI18n("stores");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const request = useMutation(api.prices.reading.request);
  const setUnits = useMutation(api.prices.choices.setUnits);
  const run = useRun();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [readId, setReadId] = useState<Id<"storeReads"> | null>(null);
  const read = useQuery(api.prices.reading.get, readId ? { readId } : "skip");
  const [units, setUnitsDraft] = useState<string | null>(null);
  const seconds = useSecondsUntil(
    read?.status === "pending" ? read.scheduledFor : undefined,
  );
  const storeName = tStores(store);
  const unit = formatUnit(material.unit, locale);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (productPage(url)?.store !== store) {
      setError(t("wrongStore", { store: storeName }));
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await run(() =>
      request({ organizationId, url, ...materialArgs(material) }),
    );
    setBusy(false);
    if (result.ok) {
      setReadId(result.value);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const choice = read?.choice;
    const value = parseDecimal(
      units ?? formatInputNumber(choice?.unitsPerSale ?? 1, locale),
    );
    if (!choice || value === undefined || value <= 0) {
      setError(tOffer("unitsInvalid"));
      return;
    }
    setBusy(true);
    const result = await run(
      () => setUnits({ choiceId: choice._id, unitsPerSale: value }),
      tOffer("saved", { name: material.name }),
    );
    setBusy(false);
    if (result.ok) {
      onDone();
    }
  };

  const header = (
    <DialogHeader>
      <DialogTitle>{t("title", { store: storeName })}</DialogTitle>
      <DialogDescription>
        {t("description", { name: material.name })}
      </DialogDescription>
    </DialogHeader>
  );

  if (read?.status === "done" && read.listing) {
    return (
      <form onSubmit={save} className="grid gap-4">
        {header}
        <div className="grid gap-1 rounded-md border border-border bg-sunken px-4 py-3">
          <a
            href={read.listing.url}
            target="_blank"
            rel="noreferrer"
            className="text-body font-medium text-ink underline-offset-[3px] hover:underline"
          >
            {read.listing.title}
          </a>
          <span className="text-meta text-ink-2">
            {tOffer("price", {
              price: formatMoney(read.listing.price, locale),
            })}
          </span>
        </div>
        <Field
          label={tOffer("units")}
          htmlFor="basket-units"
          hint={t("unitsHint")}
          error={error}
        >
          <DecimalInput
            id="basket-units"
            suffix={unit}
            value={
              units ?? formatInputNumber(read.choice?.unitsPerSale ?? 1, locale)
            }
            onChange={(event) => setUnitsDraft(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Icons.Loader className="animate-spin" aria-hidden />}
            {tOffer("save")}
          </Button>
        </DialogFooter>
      </form>
    );
  }

  const pending = read === undefined && readId !== null;
  const status = read?.status;
  return (
    <form onSubmit={submit} className="grid gap-4">
      {header}
      <Field
        label={t("url")}
        htmlFor="basket-url"
        hint={t("urlHint")}
        error={error}
      >
        <Input
          id="basket-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={`${storeSites[store].home}/…`}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />
      </Field>
      <a
        href={searchUrl(store, material.name)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-fit items-center gap-1 text-meta text-ink-2 underline-offset-[3px] hover:underline"
      >
        {t("search")}
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
      {(pending || status === "pending") && (
        <p
          role="status"
          className="m-0 flex items-center gap-2 text-body text-ink-2"
        >
          <Icons.Loader className="size-4 animate-spin" aria-hidden />
          {seconds > 1 ? t("waiting", { seconds }) : t("reading")}
        </p>
      )}
      {status && status !== "pending" && status !== "done" && (
        <p role="alert" className="m-0 text-body text-warning">
          {t(`statuses.${status}`)}
        </p>
      )}
      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="ghost" onClick={onTypePrice}>
          {t("typeInstead")}
        </Button>
        <Button
          type="submit"
          disabled={busy || pending || status === "pending"}
        >
          {(busy || status === "pending") && (
            <Icons.Loader className="animate-spin" aria-hidden />
          )}
          {t("read")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function TypedForm({
  organizationId,
  material,
  store,
  onDone,
}: {
  organizationId: Id<"organizations">;
  material: BasketMaterial;
  store: Store;
  onDone: () => void;
}) {
  const t = useScopedI18n("prices.basket.typed");
  const tOffer = useScopedI18n("prices.basket.offer");
  const tStores = useScopedI18n("stores");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const typePrice = useMutation(api.prices.choices.typePrice);
  const run = useRun();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [units, setUnits] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  // What the title says one item holds, until the person types it.
  const guessed = unitsPerSale(title, material.unit);
  const unitsText =
    units ?? (guessed ? formatInputNumber(guessed, locale) : "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const priceValue = parseDecimal(price);
    const unitsValue = parseDecimal(unitsText);
    if (
      !title.trim() ||
      priceValue === undefined ||
      priceValue <= 0 ||
      unitsValue === undefined ||
      unitsValue <= 0
    ) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        typePrice({
          organizationId,
          store,
          ...materialArgs(material),
          title: title.trim(),
          price: priceValue,
          unitsPerSale: unitsValue,
          url: url.trim() || undefined,
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
        <DialogTitle>{t("title", { store: tStores(store) })}</DialogTitle>
        <DialogDescription>
          {t("description", { name: material.name })}
        </DialogDescription>
      </DialogHeader>
      <Field label={t("product")} htmlFor="typed-title">
        <Input
          id="typed-title"
          placeholder={t("productPlaceholder")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={300}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("price")} htmlFor="typed-price">
          <DecimalInput
            id="typed-price"
            suffix="lei"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </Field>
        <Field label={tOffer("units")} htmlFor="typed-units">
          <DecimalInput
            id="typed-units"
            suffix={formatUnit(material.unit, locale)}
            value={unitsText}
            onChange={(event) => setUnits(event.target.value)}
            required
          />
        </Field>
      </div>
      <Field label={t("url")} htmlFor="typed-url" error={error}>
        <Input
          id="typed-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
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
