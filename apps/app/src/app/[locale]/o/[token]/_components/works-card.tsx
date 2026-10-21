"use client";

import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { StatusPill } from "@devize/ui/status-pill";
import { Switch } from "@devize/ui/switch";
import { cn } from "@devize/ui/utils";
import { useId, useState } from "react";
import {
  groupLines,
  type NumberedItem,
} from "@/app/[locale]/(dashboard)/estimates/[estimateId]/_components/groups";
import { formatMoney, formatQuantity, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { OfferItem, OpenOfferView } from "./types";

type Row = OfferItem & { totals: { total: number } };
type Section = OpenOfferView["sections"][number];

const sectionName = (section: Section) =>
  section.code ? `${section.code} ${section.name}` : section.name;

/**
 * The works, by object and chapter as the Deviz prints them, each with its
 * quantity and price, the materials it uses, and a switch for the optional
 * ones. Switches answer at once; the totals follow from the server.
 */
export function WorksCard({
  offer,
  excluded,
  disabled,
  onToggle,
}: {
  offer: OpenOfferView;
  // The optional works left out, as the client just chose.
  excluded: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (itemId: Id<"lineItems">, included: boolean) => void;
}) {
  const t = useScopedI18n("offerPage.works");
  const locale = useCurrentLocale();
  const groups = groupLines(
    offer.sections,
    offer.items.map(
      (item): Row => ({
        ...item,
        totals: { total: excluded.has(item._id) ? 0 : item.total },
      }),
    ),
  );
  const list = (items: NumberedItem<Row>[]) => (
    <ul className="m-0 grid list-none p-0">
      {items.map(({ item, index }) => (
        <ItemRow
          key={item._id}
          index={index}
          item={item}
          included={!excluded.has(item._id)}
          disabled={disabled}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
  const heading = (section: Section, total: number, nested: boolean) => (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-2",
        nested ? "border-b border-border" : "-mx-5 bg-sunken px-5",
      )}
    >
      <h3
        className={cn(
          "m-0 min-w-0 text-body text-ink",
          nested ? "font-medium" : "font-semibold",
        )}
      >
        {sectionName(section)}
      </h3>
      <span className="shrink-0 text-meta tabular-nums text-ink-2">
        {t("lei", { total: formatMoney(total, locale) })}
      </span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <span className="text-meta text-ink-3">
          {t("count", { count: offer.items.length })}
        </span>
      </CardHeader>
      <TickRule />
      <CardContent className="gap-0 pt-0">
        {groups.loose.length > 0 && list(groups.loose)}
        {groups.sections.map((group) => {
          const chapters = group.chapters.filter(
            (chapter) => chapter.items.length > 0,
          );
          if (group.items.length === 0 && chapters.length === 0) {
            return null;
          }
          return (
            <section key={group.section._id} className="grid">
              {heading(group.section, group.total, false)}
              {list(group.items)}
              {chapters.map((chapter) => (
                <section key={chapter.section._id} className="grid">
                  {heading(chapter.section, chapter.total, true)}
                  {list(chapter.items)}
                </section>
              ))}
            </section>
          );
        })}
        <p className="m-0 border-t border-border pt-3 text-meta text-ink-3">
          {offer.markups.vat > 0 ? t("noteVat") : t("note")}
        </p>
      </CardContent>
    </Card>
  );
}

function ItemRow({
  index,
  item,
  included,
  disabled,
  onToggle,
}: {
  index: number;
  item: Row;
  included: boolean;
  disabled: boolean;
  onToggle: (itemId: Id<"lineItems">, included: boolean) => void;
}) {
  const t = useScopedI18n("offerPage.works");
  const locale = useCurrentLocale();
  const [showMaterials, setShowMaterials] = useState(false);
  const id = useId();
  const materialsId = `${id}-materials`;
  const switchId = `${id}-include`;
  return (
    <li className="grid gap-2 border-b border-border py-4 last:border-b-0">
      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-x-3">
        <span className="pt-px text-meta tabular-nums text-ink-3">{index}</span>
        <div className={cn("grid min-w-0 gap-1", !included && "opacity-60")}>
          <span className="text-body font-medium text-ink">{item.title}</span>
          <span className="text-meta tabular-nums text-ink-3">
            {t("line", {
              quantity: formatQuantity(item.quantity, locale),
              unit: formatUnit(item.unit, locale),
              price: formatMoney(item.unitPrice, locale),
            })}
          </span>
          {item.changes.map((change) => (
            <span
              key={`${change.from}:${change.to}`}
              className="text-meta text-ink-2"
            >
              {t("changed", change)}
            </span>
          ))}
        </div>
        <div className="grid justify-items-end gap-1 text-right">
          <span
            className={cn(
              "text-body font-medium tabular-nums text-ink",
              !included && "text-ink-3 line-through",
            )}
          >
            {formatMoney(item.total, locale)}
          </span>
          {!included && (
            <span className="text-meta text-ink-3">{t("leftOut")}</span>
          )}
        </div>
      </div>
      {(item.optional || item.materials.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-[calc(1.75rem+0.75rem)]">
          {item.optional && (
            <div className="flex items-center gap-2">
              <Switch
                id={switchId}
                checked={included}
                disabled={disabled}
                onCheckedChange={(on) => onToggle(item._id, on)}
                aria-label={t("includeItem", { title: item.title })}
              />
              <label htmlFor={switchId} className="text-meta text-ink-2">
                {t("include")}
              </label>
              <StatusPill dot={false} className="h-5 text-meta">
                {t("optional")}
              </StatusPill>
            </div>
          )}
          {item.materials.length > 0 && (
            <button
              type="button"
              aria-expanded={showMaterials}
              aria-controls={materialsId}
              onClick={() => setShowMaterials(!showMaterials)}
              className="rounded-xs text-meta text-ink-2 underline underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showMaterials ? t("hideMaterials") : t("showMaterials")}
            </button>
          )}
        </div>
      )}
      {showMaterials && (
        <ul
          id={materialsId}
          aria-label={t("materials")}
          className="m-0 grid list-disc gap-0.5 pl-[calc(1.75rem+0.75rem+1rem)] text-meta text-ink-2"
        >
          {item.materials.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
