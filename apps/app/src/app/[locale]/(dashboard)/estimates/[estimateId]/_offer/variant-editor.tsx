"use client";

import { api } from "@devize/backend/convex/_generated/api";
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
import { toast } from "@devize/ui/sonner";
import { Switch } from "@devize/ui/switch";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { RotateCcw } from "lucide-react";
import { type FormEvent, useDeferredValue, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/field";
import { SearchInput } from "@/components/search-input";
import { useRun } from "@/components/use-run";
import { appErrorOf } from "@/lib/errors";
import { formatMoney, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type {
  Estimate,
  LineItem,
  LineItemResource,
} from "../_components/types";
import { isSwappable, PriceChange, searchKey } from "./swap-materials";
import { SwapPicker } from "./swap-picker";
import { useVariantError } from "./use-variant-error";
import type { Variant } from "./variants-sheet";

type Swap = Variant["swaps"][number];

/**
 * One Variantă: what it costs next to the Deviz as built, what the client
 * reads about it, and the materials it puts in the works.
 */
export function VariantEditor({
  estimate,
  variant,
  baseTotal,
  editable,
}: {
  estimate: Estimate;
  variant: Variant;
  baseTotal: number;
  editable: boolean;
}) {
  const t = useScopedI18n("offer.variants");
  const locale = useCurrentLocale();
  const difference = variant.total - baseTotal;
  return (
    <section
      aria-label={variant.name}
      className="grid gap-5 border-t border-border pt-5"
    >
      <div className="grid gap-1">
        <p className="m-0 text-body font-medium tabular-nums text-ink">
          {t("total", { total: formatMoney(variant.total, locale) })}
        </p>
        <p className="m-0 text-meta tabular-nums text-ink-3">
          {difference === 0
            ? t("same")
            : difference > 0
              ? t("more", { amount: formatMoney(difference, locale) })
              : t("less", { amount: formatMoney(-difference, locale) })}
        </p>
      </div>
      {editable ? (
        <VariantDetails variant={variant} />
      ) : (
        variant.description && (
          <p className="m-0 whitespace-pre-line text-body text-ink-2">
            {variant.description}
          </p>
        )
      )}
      <Materials estimate={estimate} variant={variant} editable={editable} />
      {editable && <RemoveVariant variant={variant} />}
    </section>
  );
}

/** The Variantă's name, tier and what the client reads about it. */
function VariantDetails({ variant }: { variant: Variant }) {
  const t = useScopedI18n("offer.variants");
  const update = useMutation(api.offers.variants.update);
  const variantError = useVariantError();
  const [name, setName] = useState(variant.name);
  const [tier, setTier] = useState<string>(variant.tier ?? "none");
  const [description, setDescription] = useState(variant.description ?? "");
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const dirty =
    name !== variant.name ||
    tier !== (variant.tier ?? "none") ||
    description !== (variant.description ?? "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await update({
        variantId: variant._id,
        name,
        tier: tier === "none" ? null : (tier as NonNullable<Variant["tier"]>),
        description,
      });
      // As the server keeps them, so the form isn't left looking unsaved.
      setName(name.trim());
      setDescription(description.trim());
      setErrors({});
      toast.success(t("saved"));
    } catch (error) {
      const detail = appErrorOf(error)?.detail;
      if (detail === "name") {
        setErrors({ name: variantError(error) });
      } else if (detail === "description") {
        setErrors({ description: variantError(error) });
      } else {
        toast.error(variantError(error));
      }
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field
          label={t("name")}
          htmlFor={`variant-name-${variant._id}`}
          error={errors.name}
        >
          <Input
            id={`variant-name-${variant._id}`}
            value={name}
            maxLength={40}
            aria-invalid={errors.name ? true : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label={t("tier")} htmlFor={`variant-tier-${variant._id}`}>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger id={`variant-tier-${variant._id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noTier")}</SelectItem>
              <SelectItem value="economy">{t("tiers.economy")}</SelectItem>
              <SelectItem value="standard">{t("tiers.standard")}</SelectItem>
              <SelectItem value="premium">{t("tiers.premium")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field
        label={t("description")}
        htmlFor={`variant-description-${variant._id}`}
        hint={t("descriptionHint")}
        error={errors.description}
      >
        <Textarea
          id={`variant-description-${variant._id}`}
          value={description}
          maxLength={300}
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          aria-invalid={errors.description ? true : undefined}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={busy || !dirty || !name.trim()}
        className="justify-self-start"
      >
        {busy && <Icons.Loader className="animate-spin" aria-hidden />}
        {t("save")}
      </Button>
    </form>
  );
}

/**
 * The Deviz's materials, work by work, with what the Variantă puts in their
 * place. A long Deviz narrows to the words typed, or to what changed.
 */
function Materials({
  estimate,
  variant,
  editable,
}: {
  estimate: Estimate;
  variant: Variant;
  editable: boolean;
}) {
  const t = useScopedI18n("offer.variants");
  const [text, setText] = useState("");
  const filter = searchKey(useDeferredValue(text));
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [picking, setPicking] = useState<string>();
  const swaps = new Map(
    variant.swaps.map((swap) => [
      `${swap.lineItemId}:${swap.resourceKey}`,
      swap,
    ]),
  );
  const any = estimate.lineItems.some((item) =>
    item.resources.some(isSwappable),
  );
  const groups = estimate.lineItems.flatMap((item) => {
    const materials = item.resources.filter((resource) => {
      if (!isSwappable(resource)) {
        return false;
      }
      const swap = swaps.get(`${item._id}:${resource.key}`);
      if (onlyChanged && !swap) {
        return false;
      }
      return (
        !filter ||
        [item.code, item.title, resource.name, swap?.name].some(
          (words) => words && searchKey(words).includes(filter),
        )
      );
    });
    return materials.length > 0 ? [{ item, materials }] : [];
  });

  return (
    <div className="grid gap-3">
      <div className="grid gap-0.5">
        <h3 className="m-0 text-body font-medium text-ink">{t("materials")}</h3>
        {editable && (
          <p className="m-0 text-meta text-ink-3">{t("materialsHint")}</p>
        )}
      </div>
      {!any ? (
        <p className="m-0 text-body text-ink-2">{t("noMaterials")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <SearchInput
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("filter")}
              aria-label={t("filter")}
              className="min-w-48 flex-1"
            />
            <div className="flex items-center gap-2">
              <Switch
                id={`variant-changed-${variant._id}`}
                checked={onlyChanged}
                onCheckedChange={setOnlyChanged}
              />
              <label
                htmlFor={`variant-changed-${variant._id}`}
                className="cursor-pointer text-body text-ink-2"
              >
                {t("onlyChanged")}
              </label>
            </div>
          </div>
          {variant.swaps.length > 0 && (
            <p className="m-0 text-meta text-ink-3">
              {t("swapCount", { count: variant.swaps.length })}
            </p>
          )}
          {groups.length === 0 ? (
            <p className="m-0 text-body text-ink-2">{t("noMatch")}</p>
          ) : (
            <ul className="m-0 grid list-none gap-4 p-0">
              {groups.map(({ item, materials }) => (
                <li key={item._id} className="grid gap-1.5">
                  <span className="text-meta text-ink-3">
                    {/[\p{L}\d]/u.test(item.code)
                      ? `${item.code} · ${item.title}`
                      : item.title}
                  </span>
                  <ul className="m-0 grid list-none gap-1.5 p-0">
                    {materials.map((resource) => {
                      const key = `${item._id}:${resource.key}`;
                      return (
                        <MaterialRow
                          key={key}
                          estimate={estimate}
                          variant={variant}
                          item={item}
                          resource={resource}
                          swap={swaps.get(key)}
                          editable={editable}
                          picking={picking === key}
                          onPick={() => setPicking(key)}
                          onClose={() => setPicking(undefined)}
                        />
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function MaterialRow({
  estimate,
  variant,
  item,
  resource,
  swap,
  editable,
  picking,
  onPick,
  onClose,
}: {
  estimate: Estimate;
  variant: Variant;
  item: LineItem;
  resource: LineItemResource;
  swap: Swap | undefined;
  editable: boolean;
  picking: boolean;
  onPick: () => void;
  onClose: () => void;
}) {
  const t = useScopedI18n("offer.variants");
  const locale = useCurrentLocale();
  const removeSwap = useMutation(api.offers.variants.removeSwap);
  const run = useRun();
  const unit = formatUnit(resource.unit, locale);
  const price = (value: number) =>
    t("perUnit", { price: formatMoney(value, locale), unit });

  return (
    <li className="grid gap-3 rounded-md border border-border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          {swap ? (
            <>
              <span className="break-words text-body text-ink">
                {swap.name}
              </span>
              <span className="text-meta text-ink-3">
                <span className="tabular-nums">{price(swap.unitPrice)}</span>{" "}
                <PriceChange from={resource.unitPrice} to={swap.unitPrice} /> ·{" "}
                {t("instead", { name: resource.name })},{" "}
                <span className="tabular-nums">
                  {price(resource.unitPrice)}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="break-words text-body text-ink">
                {resource.name}
              </span>
              <span className="text-meta tabular-nums text-ink-3">
                {price(resource.unitPrice)}
              </span>
            </>
          )}
        </div>
        {editable && !picking && (
          <div className="flex shrink-0 items-center gap-1">
            {swap && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("restore", { name: resource.name })}
                title={t("restore", { name: resource.name })}
                onClick={() =>
                  void run(
                    () =>
                      removeSwap({
                        variantId: variant._id,
                        lineItemId: item._id,
                        resourceKey: resource.key,
                      }),
                    t("restored"),
                  )
                }
              >
                <RotateCcw aria-hidden />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t("changeLabel", { name: resource.name })}
              onClick={onPick}
            >
              {t("change")}
            </Button>
          </div>
        )}
      </div>
      {picking && (
        <SwapPicker
          estimate={estimate}
          variant={variant}
          item={item}
          resource={resource}
          onDone={onClose}
        />
      )}
    </li>
  );
}

function RemoveVariant({ variant }: { variant: Variant }) {
  const t = useScopedI18n("offer.variants");
  const remove = useMutation(api.offers.variants.remove);
  const run = useRun();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start text-danger hover:text-danger"
        onClick={() => setConfirming(true)}
      >
        {t("remove")}
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("removeTitle", { name: variant.name })}
        description={t("removeDescription")}
        confirm={t("removeConfirm")}
        destructive
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const result = await run(
            () => remove({ variantId: variant._id }),
            t("removed"),
          );
          setBusy(false);
          if (result.ok) {
            setConfirming(false);
          }
        }}
      />
    </>
  );
}
