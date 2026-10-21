"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { Store } from "@devize/backend/convex/prices/resolve";
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
import { useMutation } from "convex/react";
import { ExternalLink } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import {
  formatDay,
  formatInputNumber,
  formatMoney,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { withoutVat } from "./basket-view";
import { materialArgs } from "./link-dialog";
import type { BasketMaterial, BasketPanel } from "./types";

type OfferPanel = Extract<BasketPanel, { kind: "offer" }>;

/**
 * A store's product for a material: its price and page, how many of the
 * material's units one item holds, and the way to choose, replace or remove
 * it.
 */
export function OfferDialog({
  organizationId,
  panel,
  onClose,
  onReplace,
}: {
  organizationId: Id<"organizations">;
  panel: OfferPanel | null;
  onClose: () => void;
  onReplace: (material: BasketMaterial, store: Store) => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={panel !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-lg">
        {panel && (
          <OfferForm
            key={panel.offer.listingId}
            organizationId={organizationId}
            panel={panel}
            onDone={onClose}
            onReplace={() => onReplace(panel.material, panel.offer.store)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OfferForm({
  organizationId,
  panel,
  onDone,
  onReplace,
}: {
  organizationId: Id<"organizations">;
  panel: OfferPanel;
  onDone: () => void;
  onReplace: () => void;
}) {
  const t = useScopedI18n("prices.basket.offer");
  const tStores = useScopedI18n("stores");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const setUnits = useMutation(api.prices.choices.setUnits);
  const pick = useMutation(api.prices.choices.pick);
  const remove = useMutation(api.prices.choices.remove);
  const run = useRun();
  const { material, offer } = panel;
  const [units, setUnitsDraft] = useState(() =>
    formatInputNumber(offer.unitsPerSale, locale),
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const unit = formatUnit(material.unit, locale);
  const value = parseDecimal(units);
  const perUnit =
    value && value > 0
      ? withoutVat(offer.price, offer.includedVat) / value
      : undefined;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (value === undefined || value <= 0) {
      setError(t("unitsInvalid"));
      return;
    }
    setError(undefined);
    setBusy(true);
    const { choiceId } = offer;
    const result = await run(
      () =>
        choiceId
          ? setUnits({ choiceId, unitsPerSale: value })
          : pick({
              organizationId,
              listingId: offer.listingId,
              ...materialArgs(material),
              unitsPerSale: value,
            }),
      t("saved", { name: material.name }),
    );
    setBusy(false);
    if (result.ok) {
      onDone();
    }
  };

  const removeChoice = async () => {
    const { choiceId } = offer;
    if (!choiceId) {
      return;
    }
    setBusy(true);
    const result = await run(() => remove({ choiceId }), t("removed"));
    setBusy(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={save} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{offer.title}</DialogTitle>
        <DialogDescription>
          {`${tStores(offer.store)} · ${
            offer.typed
              ? t("typedAt", { date: formatDay(offer.checkedAt, locale) })
              : t("checkedAt", { date: formatDay(offer.checkedAt, locale) })
          }`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-1 rounded-md border border-border bg-sunken px-4 py-3">
        <span className="text-body font-medium text-ink">
          {t("price", { price: formatMoney(offer.price, locale) })}
        </span>
        {perUnit !== undefined && (
          <span className="text-meta text-ink-2">
            {t("perUnit", { price: formatMoney(perUnit, locale), unit })}
          </span>
        )}
        {offer.url && (
          <a
            href={offer.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 text-meta text-ink-2 underline-offset-[3px] hover:underline"
          >
            {t("open", { store: tStores(offer.store) })}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
      <Field label={t("units")} htmlFor="offer-units" error={error}>
        <DecimalInput
          id="offer-units"
          suffix={unit}
          value={units}
          onChange={(event) => setUnitsDraft(event.target.value)}
        />
      </Field>
      <DialogFooter className="gap-2 sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onReplace}>
            {t("replace")}
          </Button>
          {offer.choiceId && (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:text-danger"
              onClick={removeChoice}
              disabled={busy}
            >
              {t("remove")}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Icons.Loader className="animate-spin" aria-hidden />}
            {offer.choiceId ? t("save") : t("choose")}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
