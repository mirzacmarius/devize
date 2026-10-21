"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { normalizeText } from "@devize/backend/convex/lib/text";
import {
  type WorkContext,
  workContexts,
} from "@devize/backend/convex/systems/contexts";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { Textarea } from "@devize/ui/textarea";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { SearchInput } from "@/components/search-input";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { ProducerSystem, ProducerSystems } from "./systems-page";

type Fit = "any" | "yes" | "no";
type Choices = NonNullable<ProducerSystems["choices"]>;

// A search field over the norms once there are more than this many.
const SEARCH_FROM = 8;

/**
 * Writes one of the producer's systems, in a sheet beside its page: its
 * name, the norms and products that make it up, and where it suits or
 * doesn't. A new one is a draft.
 */
export function SystemSheet({
  manufacturerId,
  choices,
  editing,
  onClose,
}: {
  manufacturerId: Id<"manufacturers">;
  choices: Choices;
  editing: { system: ProducerSystem | null } | null;
  onClose: () => void;
}) {
  const t = useScopedI18n("compatibility.producerSystems.dialog");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={editing !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent closeLabel={tc("close")} className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editing?.system ? t("editTitle") : t("newTitle")}
          </SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        {editing && (
          <SystemForm
            key={editing.system?._id ?? "new"}
            manufacturerId={manufacturerId}
            choices={choices}
            system={editing.system}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function SystemForm({
  manufacturerId,
  choices,
  system,
  onDone,
}: {
  manufacturerId: Id<"manufacturers">;
  choices: Choices;
  system: ProducerSystem | null;
  onDone: () => void;
}) {
  const t = useScopedI18n("compatibility.producerSystems.dialog");
  const tContexts = useScopedI18n("compatibility.contexts");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const save = useMutation(api.systems.producerSystems.save);
  const run = useRun();
  const [name, setName] = useState(system?.name ?? "");
  const [description, setDescription] = useState(system?.description ?? "");
  const [norms, setNorms] = useState(
    () => new Set(system?.norms.map((norm) => norm.lineageId) ?? []),
  );
  const [products, setProducts] = useState(
    () => new Set(system?.products.map((product) => product.productId) ?? []),
  );
  const [fits, setFits] = useState<Record<WorkContext, Fit>>(() => {
    const result = {} as Record<WorkContext, Fit>;
    for (const context of workContexts) {
      result[context] = system?.suitable.includes(context)
        ? "yes"
        : system?.unsuitable.includes(context)
          ? "no"
          : "any";
    }
    return result;
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // The published norms to choose from, and the system's own still in draft.
  const normChoices = [
    ...choices.norms,
    ...(system?.norms ?? []).filter(
      (norm) => !choices.norms.some((c) => c.lineageId === norm.lineageId),
    ),
  ];
  const productChoices = [
    ...choices.products,
    ...(system?.products ?? []).filter(
      (product) =>
        !choices.products.some((c) => c.productId === product.productId),
    ),
  ];
  const words = normalizeText(search).split(" ").filter(Boolean);
  const shownNorms = normChoices.filter((norm) => {
    const text = normalizeText(`${norm.code} ${norm.title}`);
    return words.every((word) => text.includes(word));
  });

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (norms.size + products.size === 0) {
      setError(t("parts"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        save({
          manufacturerId,
          systemId: system?._id,
          name,
          description,
          normLineageIds: [...norms],
          productIds: [...products],
          suitable: workContexts.filter((context) => fits[context] === "yes"),
          unsuitable: workContexts.filter((context) => fits[context] === "no"),
        }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      <Field label={t("name")} htmlFor="system-name">
        <Input
          id="system-name"
          value={name}
          maxLength={120}
          placeholder={t("namePlaceholder")}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>
      <Field label={t("about")} htmlFor="system-description">
        <Textarea
          id="system-description"
          value={description}
          maxLength={1000}
          rows={2}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-label uppercase text-ink-3">
          {t("norms")}
        </legend>
        {normChoices.length > SEARCH_FROM && (
          <SearchInput
            aria-label={t("norms")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}
        {normChoices.length === 0 ? (
          <p className="m-0 text-meta text-ink-3">{t("noNorms")}</p>
        ) : (
          <ul className="m-0 grid max-h-56 list-none gap-1 overflow-y-auto p-0">
            {shownNorms.map((norm) => (
              <li key={norm.lineageId}>
                <label className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 hover:bg-tile">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={norms.has(norm.lineageId)}
                    onChange={() =>
                      setNorms((current) => toggle(current, norm.lineageId))
                    }
                  />
                  <span className="min-w-0 text-body text-ink">
                    <span className="font-mono text-code">{norm.code}</span>{" "}
                    {norm.title}
                    <span className="text-ink-3">
                      {" "}
                      · {formatUnit(norm.unit, locale)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-label uppercase text-ink-3">
          {t("products")}
        </legend>
        {productChoices.length === 0 ? (
          <p className="m-0 text-meta text-ink-3">{t("noProducts")}</p>
        ) : (
          <ul className="m-0 grid max-h-40 list-none gap-1 overflow-y-auto p-0">
            {productChoices.map((product) => (
              <li key={product.productId}>
                <label className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 hover:bg-tile">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={products.has(product.productId)}
                    onChange={() =>
                      setProducts((current) =>
                        toggle(current, product.productId),
                      )
                    }
                  />
                  <span className="min-w-0 text-body text-ink">
                    {product.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-label uppercase text-ink-3">
          {t("contexts")}
        </legend>
        <p className="m-0 text-meta text-ink-3">{t("contextsHint")}</p>
        {workContexts.map((context) => (
          <div
            key={context}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span className="inline-block text-body text-ink first-letter:uppercase">
              {tContexts(context)}
            </span>
            <SegmentedControl
              label={tContexts(context)}
              value={fits[context]}
              options={[
                { value: "any", label: t("any") },
                { value: "yes", label: t("yes") },
                { value: "no", label: t("no") },
              ]}
              onChange={(value) =>
                setFits((current) => ({ ...current, [context]: value }))
              }
            />
          </div>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="m-0 text-meta text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
