"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Estimate } from "../_components/types";
import { useVariantError } from "./use-variant-error";
import { VariantEditor } from "./variant-editor";

export type Variants = FunctionReturnType<
  typeof api.offers.variants.forEstimate
>;
export type Variant = Variants["variants"][number];
type Tier = NonNullable<Variant["tier"]>;

const MAX_VARIANTS = 4;
const tiers: Tier[] = ["economy", "standard", "premium"];

/**
 * The Deviz's Variante for the Ofertă, as a line on its card: which there are,
 * and the sheet to make and change them.
 */
export function OfferVariants({ estimate }: { estimate: Estimate }) {
  const t = useScopedI18n("offer.variants");
  const locale = useCurrentLocale();
  const data = useQuery(api.offers.variants.forEstimate, {
    estimateId: estimate._id,
  });
  const [open, setOpen] = useState(false);
  const editable = estimate.lockedAt === undefined;
  if (data === undefined || (!editable && data.variants.length === 0)) {
    return null;
  }
  const names = data.variants.map((variant) => variant.name);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md border border-border px-3 py-2.5">
      <div className="grid min-w-0 gap-0.5">
        <span className="text-body font-medium text-ink">{t("title")}</span>
        <span className="text-meta text-ink-2">
          {names.length === 0
            ? t("none")
            : t("some", {
                names: new Intl.ListFormat(locale).format([
                  t("baseInList"),
                  ...names,
                ]),
              })}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        {!editable ? t("view") : names.length === 0 ? t("add") : t("edit")}
      </Button>
      <VariantsSheet
        estimate={estimate}
        variants={data}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function VariantsSheet({
  estimate,
  variants,
  open,
  onClose,
}: {
  estimate: Estimate;
  variants: Variants;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("offer.variants");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        closeLabel={tc("close")}
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>{t("sheetTitle")}</SheetTitle>
          <SheetDescription>{t("sheetDescription")}</SheetDescription>
        </SheetHeader>
        {open && <VariantsPanel estimate={estimate} data={variants} />}
      </SheetContent>
    </Sheet>
  );
}

/** The Variante side by side with the Deviz as built, and the one being edited. */
function VariantsPanel({
  estimate,
  data,
}: {
  estimate: Estimate;
  data: Variants;
}) {
  const t = useScopedI18n("offer.variants");
  const locale = useCurrentLocale();
  const editable = estimate.lockedAt === undefined;
  const [selected, setSelected] = useState<Id<"variants">>();
  const current =
    data.variants.find((variant) => variant._id === selected) ??
    data.variants[0];
  const difference = (total: number) => {
    const amount = formatMoney(Math.abs(total - data.baseTotal), locale);
    return total > data.baseTotal ? `+${amount}` : `−${amount}`;
  };

  return (
    <div className="grid gap-5">
      {!editable && (
        <p className="m-0 rounded-md border border-border bg-sunken px-3 py-2 text-meta text-ink-2">
          {t("locked")}
        </p>
      )}
      <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
        <legend className="sr-only">{t("choose")}</legend>
        <div className="flex items-center justify-between gap-3 rounded-md bg-sunken px-3 py-2">
          <span className="text-body text-ink-2">{t("base")}</span>
          <span className="text-body tabular-nums text-ink-2">
            {t("lei", { total: formatMoney(data.baseTotal, locale) })}
          </span>
        </div>
        {data.variants.map((variant) => {
          const pressed = variant._id === current?._id;
          return (
            <button
              key={variant._id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setSelected(variant._id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pressed && "border-primary bg-selected hover:bg-selected",
              )}
            >
              <span className="min-w-0 truncate text-body font-medium text-ink">
                {variant.name}
              </span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="text-body text-ink">
                  {t("lei", { total: formatMoney(variant.total, locale) })}
                </span>
                {variant.total !== data.baseTotal && (
                  <span className="text-meta text-ink-3">
                    {difference(variant.total)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </fieldset>
      {editable && data.variants.length < MAX_VARIANTS && (
        <NewVariant
          estimate={estimate}
          variants={data.variants}
          onCreated={setSelected}
        />
      )}
      {current ? (
        <VariantEditor
          key={current._id}
          estimate={estimate}
          variant={current}
          baseTotal={data.baseTotal}
          editable={editable}
        />
      ) : (
        <p className="m-0 text-body text-ink-2">
          {editable ? t("empty") : t("emptyLocked")}
        </p>
      )}
    </div>
  );
}

/** Starts a Variantă of a tier, named after it, or one to name later. */
function NewVariant({
  estimate,
  variants,
  onCreated,
}: {
  estimate: Estimate;
  variants: Variant[];
  onCreated: (variantId: Id<"variants">) => void;
}) {
  const t = useScopedI18n("offer.variants");
  const create = useMutation(api.offers.variants.create);
  const variantError = useVariantError();
  const [busy, setBusy] = useState(false);
  const taken = new Set(variants.map((variant) => variant.name.toLowerCase()));
  const otherName = () => {
    let number = variants.length + 1;
    while (taken.has(t("otherName", { number }).toLowerCase())) {
      number++;
    }
    return t("otherName", { number });
  };

  const add = async (name: string, tier?: Tier) => {
    setBusy(true);
    try {
      const variantId = await create({
        estimateId: estimate._id,
        name,
        tier,
      });
      onCreated(variantId);
      toast.success(t("created", { name }));
    } catch (error) {
      toast.error(variantError(error));
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-2">
      <span className="text-meta text-ink-3">{t("newTitle")}</span>
      <div className="flex flex-wrap gap-2">
        {tiers.map((tier) => {
          const name = t(`tiers.${tier}`);
          return (
            <Button
              key={tier}
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || taken.has(name.toLowerCase())}
              onClick={() => void add(name, tier)}
            >
              <Plus aria-hidden />
              {name}
            </Button>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void add(otherName())}
        >
          <Plus aria-hidden />
          {t("other")}
        </Button>
      </div>
    </div>
  );
}
