"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { toast } from "@devize/ui/sonner";
import { Switch } from "@devize/ui/switch";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { type FormEvent, useDeferredValue, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { SearchInput } from "@/components/search-input";
import {
  formatInputNumber,
  formatMoney,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type {
  Estimate,
  LineItem,
  LineItemResource,
} from "../_components/types";
import { PriceChange, sameMaterial } from "./swap-materials";
import { useVariantError } from "./use-variant-error";
import type { Variant } from "./variants-sheet";

type Alternative = FunctionReturnType<
  typeof api.offers.variants.alternatives
>[number];

/**
 * Chooses what a Variantă puts in place of one of a work's materials: one
 * from the catalog, in the same unit and priced as the Deviz prices its own,
 * or one typed by hand. It can go in every work with that material.
 */
export function SwapPicker({
  estimate,
  variant,
  item,
  resource,
  onDone,
}: {
  estimate: Estimate;
  variant: Variant;
  item: LineItem;
  resource: LineItemResource;
  onDone: () => void;
}) {
  const t = useScopedI18n("offer.variants");
  const tc = useScopedI18n("common");
  const tSources = useScopedI18n("estimate.sources");
  const tStores = useScopedI18n("stores");
  const locale = useCurrentLocale();
  const setSwap = useMutation(api.offers.variants.setSwap);
  const variantError = useVariantError();
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const alternatives = useQuery(api.offers.variants.alternatives, {
    lineItemId: item._id,
    resourceKey: resource.key,
    ...(search ? { text: search } : {}),
  });
  const [picked, setPicked] = useState<Alternative | "typed">();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const uses = estimate.lineItems.reduce(
    (count, other) =>
      count +
      other.resources.filter((used) => sameMaterial(used, resource)).length,
    0,
  );
  const [everywhere, setEverywhere] = useState(true);
  const unit = formatUnit(resource.unit, locale);
  const id = `swap-${item._id}-${resource.key}`;

  const pick = (choice: Alternative | "typed") => {
    setPicked(choice);
    setError(undefined);
    setPrice(
      choice === "typed" || choice.priceSource === "missing"
        ? ""
        : formatInputNumber(choice.unitPrice, locale),
    );
  };
  // Where the price comes from; a missing one says so on the right already.
  const about = (alternative: Alternative) =>
    [
      alternative.sameMaterial ? t("sameMaterial") : undefined,
      alternative.priceSource === "missing"
        ? undefined
        : alternative.priceSource === "listing" && alternative.store
          ? tStores(alternative.store)
          : tSources(alternative.priceSource),
    ]
      .filter(Boolean)
      .join(" · ");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!picked) {
      return;
    }
    const typed = price.trim() ? parseDecimal(price) : undefined;
    if (price.trim() && (typed === undefined || typed < 0)) {
      setError(t("errors.price"));
      return;
    }
    let replacement: {
      resourceId?: Alternative["resourceId"];
      productId?: Alternative["productId"];
      name?: string;
      unitPrice?: number;
    };
    if (picked === "typed") {
      if (!name.trim()) {
        setError(t("errors.typedName"));
        return;
      }
      if (typed === undefined) {
        setError(t("errors.price"));
        return;
      }
      replacement = { name: name.trim(), unitPrice: typed };
    } else {
      const catalogPrice =
        picked.priceSource === "missing"
          ? undefined
          : formatInputNumber(picked.unitPrice, locale);
      if (catalogPrice === undefined && typed === undefined) {
        setError(t("errors.price"));
        return;
      }
      // A price left as the catalog gave it keeps the catalog's source.
      replacement = {
        resourceId: picked.resourceId,
        productId: picked.productId,
        unitPrice: price.trim() === catalogPrice ? undefined : typed,
      };
    }
    setBusy(true);
    try {
      const changed = await setSwap({
        variantId: variant._id,
        lineItemId: item._id,
        resourceKey: resource.key,
        everywhere: uses > 1 && everywhere,
        ...replacement,
      });
      toast.success(
        changed > 1 ? t("appliedMany", { count: changed }) : t("applied"),
      );
      onDone();
    } catch (caught) {
      setError(variantError(caught, unit));
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-md border border-border bg-sunken p-3">
      <p className="m-0 text-meta font-medium text-ink">
        {t("pickTitle", { name: resource.name })}
      </p>
      <SearchInput
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("search")}
        aria-label={t("search")}
      />
      {alternatives === undefined ? (
        <p className="m-0 inline-flex items-center gap-2 text-meta text-ink-3">
          <Icons.Loader className="size-3.5 animate-spin" aria-hidden />
          {t("searching")}
        </p>
      ) : alternatives.length === 0 ? (
        <p className="m-0 text-meta text-ink-3">
          {t("noAlternatives", { unit })}
        </p>
      ) : (
        <ul className="m-0 grid max-h-64 list-none gap-0.5 overflow-y-auto rounded-md border border-border bg-card p-1">
          {alternatives.map((alternative) => {
            const chosen =
              picked !== "typed" && picked?.key === alternative.key;
            const missing = alternative.priceSource === "missing";
            return (
              <li key={alternative.key}>
                <button
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => pick(alternative)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    chosen && "bg-muted hover:bg-muted",
                  )}
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-body text-ink">
                      {alternative.name}
                    </span>
                    {about(alternative) && (
                      <span className="truncate text-meta text-ink-3">
                        {about(alternative)}
                      </span>
                    )}
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-0.5 tabular-nums">
                    <span
                      className={cn(
                        "text-body",
                        missing ? "text-ink-3" : "text-ink",
                      )}
                    >
                      {missing
                        ? t("noPrice")
                        : t("perUnit", {
                            price: formatMoney(alternative.unitPrice, locale),
                            unit,
                          })}
                    </span>
                    {!missing && (
                      <span className="text-meta text-ink-3">
                        <PriceChange
                          from={resource.unitPrice}
                          to={alternative.unitPrice}
                        />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {picked !== "typed" && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="justify-self-start px-0"
          onClick={() => pick("typed")}
        >
          {t("typed")}
        </Button>
      )}
      <form onSubmit={submit} className="grid gap-3">
        {picked === "typed" && (
          <Field label={t("typedName")} htmlFor={`${id}-name`}>
            <Input
              id={`${id}-name`}
              value={name}
              maxLength={120}
              placeholder={t("typedNamePlaceholder")}
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
            />
          </Field>
        )}
        {picked && (
          <Field
            label={t("price", { unit })}
            htmlFor={`${id}-price`}
            hint={picked === "typed" ? undefined : t("priceHint")}
            error={error}
          >
            <DecimalInput
              id={`${id}-price`}
              suffix={`lei/${unit}`}
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
                setError(undefined);
              }}
            />
          </Field>
        )}
        {picked && uses > 1 && (
          <div className="flex items-center gap-2">
            <Switch
              id={`${id}-everywhere`}
              checked={everywhere}
              onCheckedChange={setEverywhere}
            />
            <label
              htmlFor={`${id}-everywhere`}
              className="cursor-pointer text-body text-ink-2"
            >
              {t("everywhere", { count: uses })}
            </label>
          </div>
        )}
        {!picked && error && (
          <p role="alert" className="m-0 text-meta text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {picked && (
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Icons.Loader className="animate-spin" aria-hidden />}
              {t("apply")}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {tc("cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
