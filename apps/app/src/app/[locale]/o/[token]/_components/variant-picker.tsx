"use client";

import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { cn } from "@devize/ui/utils";
import { formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { OpenOfferView } from "./types";

/**
 * The Variante the firm offers side by side, each with its total for the
 * works chosen below: the Deviz as built, and the cheaper or better ones.
 */
export function VariantPicker({
  offer,
  value,
  disabled,
  onChange,
}: {
  offer: OpenOfferView;
  value: Id<"variants"> | undefined;
  disabled: boolean;
  onChange: (variantId: Id<"variants"> | undefined) => void;
}) {
  const t = useScopedI18n("offerPage.variants");
  const locale = useCurrentLocale();
  const options = [
    {
      key: "base",
      variantId: undefined,
      name: offer.baseLabel ?? t("base"),
      description: undefined,
      total: offer.baseTotal,
    },
    ...offer.variants.map((variant) => ({
      key: variant._id,
      variantId: variant._id,
      name: variant.name,
      description: variant.description,
      total: variant.total,
    })),
  ];
  return (
    <Card>
      <CardHeader className="grid justify-start gap-1">
        <CardTitle>{disabled ? t("chosenTitle") : t("title")}</CardTitle>
        {!disabled && (
          <CardDescription className="m-0">{t("hint")}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <fieldset
          disabled={disabled}
          className="m-0 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2 xl:grid-cols-3"
        >
          <legend className="sr-only">{t("title")}</legend>
          {options.map((option) => {
            const checked = option.variantId === value;
            return (
              <label
                key={option.key}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col gap-1 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-tile has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-default has-[:disabled]:hover:bg-card",
                  checked &&
                    "border-primary bg-selected has-[:disabled]:hover:bg-selected",
                )}
              >
                <input
                  type="radio"
                  name="variant"
                  className="sr-only"
                  checked={checked}
                  onChange={() => onChange(option.variantId)}
                />
                <span className="flex items-center justify-between gap-2 text-body font-medium text-ink">
                  <span className="truncate">{option.name}</span>
                  {checked && <Icons.Check aria-hidden className="size-4" />}
                </span>
                {option.description && (
                  <span className="text-meta text-ink-2">
                    {option.description}
                  </span>
                )}
                <span className="mt-auto text-body tabular-nums text-ink-2">
                  {t("total", { total: formatMoney(option.total, locale) })}
                </span>
              </label>
            );
          })}
        </fieldset>
      </CardContent>
    </Card>
  );
}
