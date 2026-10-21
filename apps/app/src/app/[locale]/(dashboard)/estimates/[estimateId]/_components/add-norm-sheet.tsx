"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Badge } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { type FormEvent, useDeferredValue, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useNormSource } from "@/components/norm-source";
import { SearchInput } from "@/components/search-input";
import { useRun } from "@/components/use-run";
import {
  formatConsumption,
  formatPercent,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { resourceKinds } from "@/lib/resource-values";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { SectionSelect } from "./section-select";
import type { Estimate } from "./types";

/**
 * Finds norms by code or by the words of the work and adds them to the Deviz
 * with a quantity. It stays open, so several items go in one after another.
 */
export function AddNormSheet({
  estimate,
  open,
  sectionId,
  onClose,
  onCustom,
}: {
  estimate: Estimate;
  open: boolean;
  sectionId: Id<"sections"> | undefined;
  onClose: () => void;
  onCustom: (sectionId: Id<"sections"> | undefined) => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        closeLabel={tc("close")}
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{t("addNorm.title")}</SheetTitle>
          <SheetDescription>{t("addNorm.description")}</SheetDescription>
        </SheetHeader>
        {open && (
          <AddNorm
            estimate={estimate}
            initialSectionId={sectionId}
            onCustom={onCustom}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function AddNorm({
  estimate,
  initialSectionId,
  onCustom,
}: {
  estimate: Estimate;
  initialSectionId: Id<"sections"> | undefined;
  onCustom: (sectionId: Id<"sections"> | undefined) => void;
}) {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Id<"norms"> | null>(null);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [added, setAdded] = useState(0);
  const search = useDeferredValue(text.trim());
  const results = useQuery(
    api.catalog.norms.search,
    search
      ? { organizationId: estimate.organizationId, text: search, limit: 30 }
      : "skip",
  );

  return (
    <div className="grid gap-4">
      {added > 0 && (
        <p className="m-0 flex items-center gap-2 text-meta text-success">
          <Icons.Check className="size-4" aria-hidden />
          {t("addNorm.addedCount", { count: added })}
        </p>
      )}
      {selected ? (
        <NormPreview
          estimate={estimate}
          normId={selected}
          sectionId={sectionId}
          onSectionChange={setSectionId}
          onBack={() => setSelected(null)}
          onAdded={() => {
            setAdded((count) => count + 1);
            setSelected(null);
          }}
        />
      ) : (
        <>
          <SearchInput
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("addNorm.searchPlaceholder")}
            aria-label={t("addNorm.searchPlaceholder")}
            autoFocus
          />
          {!search ? (
            <p className="m-0 text-meta text-ink-3">{t("addNorm.hint")}</p>
          ) : results === undefined ? (
            <p className="m-0 text-meta text-ink-3">{t("addNorm.searching")}</p>
          ) : results.length === 0 ? (
            <p className="m-0 text-meta text-ink-3">
              {t("addNorm.noResults", { text: search })}
            </p>
          ) : (
            <ul
              aria-label={t("addNorm.results")}
              className="m-0 grid list-none gap-0.5 p-0"
            >
              {results.map((norm) => (
                <li key={norm._id}>
                  <button
                    type="button"
                    onClick={() => setSelected(norm._id)}
                    className="grid w-full gap-0.5 rounded-md px-3 py-2.5 text-left hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-code text-ink-2">
                        {norm.code}
                      </span>
                      <span className="shrink-0 text-meta text-ink-3">
                        {formatUnit(norm.unit, locale)}
                      </span>
                    </span>
                    <span className="text-body text-ink">{norm.title}</span>
                    <span className="text-meta text-ink-3">
                      {normSource(norm)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="link"
            className="justify-self-start"
            onClick={() => onCustom(sectionId)}
          >
            {t("addNorm.custom")}
          </Button>
        </>
      )}
    </div>
  );
}

function NormPreview({
  estimate,
  normId,
  sectionId,
  onSectionChange,
  onBack,
  onAdded,
}: {
  estimate: Estimate;
  normId: Id<"norms">;
  sectionId: Id<"sections"> | undefined;
  onSectionChange: (sectionId: Id<"sections"> | undefined) => void;
  onBack: () => void;
  onAdded: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tKinds = useScopedI18n("resources");
  const tNorms = useScopedI18n("norms");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const norm = useQuery(api.catalog.norms.get, { normId });
  const addFromNorm = useMutation(api.estimates.lineItems.addFromNorm);
  const run = useRun();
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!norm) {
      return;
    }
    const amount = parseDecimal(quantity);
    if (amount === undefined || amount < 0) {
      setError(t("addNorm.quantityInvalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        addFromNorm({
          estimateId: estimate._id,
          normId,
          quantity: amount,
          sectionId,
        }),
      t("addNorm.added", { code: norm.code }),
    );
    setSaving(false);
    if (result.ok) {
      onAdded();
    }
  };

  const resources = norm
    ? [...norm.resources].sort(
        (a, b) => resourceKinds.indexOf(a.kind) - resourceKinds.indexOf(b.kind),
      )
    : [];
  const notes = norm
    ? [
        { label: t("addNorm.includes"), text: norm.includes },
        { label: t("addNorm.excludes"), text: norm.excludes },
        { label: t("addNorm.measurement"), text: norm.measurement },
      ].filter((note) => note.text)
    : [];

  return (
    <div className="grid gap-4">
      <Button
        type="button"
        variant="link"
        className="justify-self-start"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden />
        {t("addNorm.back")}
      </Button>
      {norm === undefined ? (
        <p className="m-0 text-meta text-ink-3">{t("addNorm.loading")}</p>
      ) : (
        <>
          <div className="grid gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-code text-ink-2">
                {norm.code}
              </span>
              {norm.source === "manufacturer" && !norm.confirmedAt && (
                <Badge>{tNorms("unconfirmed")}</Badge>
              )}
            </span>
            <h3 className="m-0 text-title-card text-ink">{norm.title}</h3>
            <span className="text-meta text-ink-3">
              {[
                normSource(norm),
                norm.version > 1 ? `v${norm.version}` : undefined,
                norm.edition,
                t("addNorm.unit", { unit: formatUnit(norm.unit, locale) }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {notes.length > 0 && (
            <dl className="m-0 grid gap-2">
              {notes.map((note) => (
                <div key={note.label} className="grid gap-0.5">
                  <dt className="text-label uppercase text-ink-3">
                    {note.label}
                  </dt>
                  <dd className="m-0 whitespace-pre-line text-body text-ink-2">
                    {note.text}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="grid gap-2 rounded-md border border-border bg-sunken px-4 py-3">
            <p className="m-0 text-label uppercase text-ink-3">
              {t("addNorm.resources", { unit: formatUnit(norm.unit, locale) })}
            </p>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {resources.map((resource) => (
                <li
                  key={resource._id}
                  className="flex min-w-0 items-baseline justify-between gap-3 text-body"
                >
                  <span className="grid min-w-0">
                    <span className="text-ink">{resource.name}</span>
                    <span className="text-meta text-ink-3">
                      {tKinds(`kinds.${resource.kind}`)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-2">
                    {resource.unit === "%"
                      ? formatPercent(resource.quantity, locale)
                      : `${formatConsumption(resource.quantity, locale)} ${formatUnit(resource.unit, locale)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <form className="grid gap-4" onSubmit={submit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("addNorm.quantity")}
                htmlFor="add-norm-quantity"
                error={error}
              >
                <DecimalInput
                  id="add-norm-quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  suffix={formatUnit(norm.unit, locale)}
                  aria-invalid={error !== undefined}
                  autoFocus
                />
              </Field>
              {estimate.sections.length > 0 && (
                <Field label={t("addNorm.section")} htmlFor="add-norm-section">
                  <SectionSelect
                    id="add-norm-section"
                    sections={estimate.sections}
                    value={sectionId}
                    onChange={onSectionChange}
                  />
                </Field>
              )}
            </div>
            <Button
              type="submit"
              className="justify-self-end"
              disabled={saving}
            >
              {saving && <Icons.Loader className="animate-spin" aria-hidden />}
              {t("addNorm.add")}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
