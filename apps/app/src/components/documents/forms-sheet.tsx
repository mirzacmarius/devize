"use client";

import {
  checkForms,
  clampMonths,
  type DocumentKind,
  defaultLabel,
  documentKinds,
  type FormCheck,
  offerValue,
  procurement,
  type ResourceScope,
  type SheetCategory,
  type Subchapter,
  sheetCategories,
  suggestedMonths,
} from "@devize/forms/sheet";
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
import { Switch } from "@devize/ui/switch";
import { type FormEvent, useMemo, useState } from "react";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useScopedI18n } from "@/locales/client";
import { type Estimate, worksOf } from "./export-data";
import { type CheckAction, FormChecks } from "./form-checks";
import { OfferFields, type OfferInput, validityDays } from "./offer-fields";
import { type Placement, PlacementFields, placedIn } from "./placement-fields";
import {
  MonthsField,
  ScheduleFields,
  shiftedWindows,
  type Windows,
} from "./schedule-fields";
import {
  readChoices,
  readSigner,
  writeChoices,
  writeSigner,
} from "./stored-choices";
import { useDownloadDocuments } from "./use-download-documents";

// The official forms one PDF can hold, in the order they print.
type FormKind = Exclude<DocumentKind, "DEVIZ">;
const formKinds = documentKinds.filter(
  (kind): kind is FormKind => kind !== "DEVIZ",
);
const resourceForms: readonly FormKind[] = ["C6", "C7", "C8", "C9"];
// The forms that total the works by the Deviz general's subchapters.
const placedForms: readonly FormKind[] = ["DG", "DO", "F1", "F2", "F4", "F5"];

/**
 * The forms a tender usually asks of a bidder: the offer form, the financial
 * offer's F1–F3, F4 and F5 when the works buy equipment or furnishings, and
 * the resource lists.
 */
function offerKinds(
  categories: readonly SheetCategory[],
  placement: Placement,
): Set<FormKind> {
  const kinds = new Set<FormKind>([
    "OF",
    "F1",
    "F2",
    "F3",
    "C6",
    "C7",
    "C8",
    "C9",
  ]);
  if (
    categories.some((category) =>
      procurement.includes(placedIn(placement, category)),
    )
  ) {
    kinds.add("F4");
    kinds.add("F5");
  }
  return kinds;
}

/** Chooses a tender's forms and how they read, then downloads them. */
export function FormsSheet({
  estimate,
  open,
  onClose,
}: {
  estimate: Estimate;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("documents.forms");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        closeLabel={tc("close")}
        className="w-full overflow-y-auto sm:w-3/4 sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{t("sheetTitle")}</SheetTitle>
          <SheetDescription>{t("sheetDescription")}</SheetDescription>
        </SheetHeader>
        {open && <FormsForm estimate={estimate} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function FormsForm({
  estimate,
  onDone,
}: {
  estimate: Estimate;
  onDone: () => void;
}) {
  const t = useScopedI18n("documents.forms");
  const tc = useScopedI18n("common");
  const download = useDownloadDocuments(estimate);
  const works = useMemo(() => worksOf(estimate), [estimate]);
  const categories = useMemo(() => sheetCategories(works), [works]);
  const suggested = useMemo(() => suggestedMonths(works), [works]);
  // The sheet starts from what was chosen for this Deviz last time.
  const [stored] = useState(() => readChoices(estimate._id));
  const [placement, setPlacement] = useState<Placement>(
    () => stored.subchapters ?? {},
  );
  const [chosen, setChosen] = useState<ReadonlySet<FormKind>>(() => {
    const kinds = formKinds.filter((kind) => stored.kinds?.includes(kind));
    return kinds.length > 0
      ? new Set(kinds)
      : offerKinds(categories, stored.subchapters ?? {});
  });
  const [labels, setLabels] = useState<Partial<Record<FormKind, string>>>(
    () => stored.labels ?? {},
  );
  // Forms already renamed show their names.
  const [renaming, setRenaming] = useState(() =>
    Object.values(labels).some((label) => label?.trim()),
  );
  const [withValues, setWithValues] = useState(stored.withValues ?? true);
  const [scope, setScope] = useState<ResourceScope>(stored.scope ?? "object");
  // Who the forms are for, as they will print unless changed.
  const authority =
    (estimate.kind === "tender" && estimate.tender?.authority) ||
    estimate.client?.name ||
    "";
  const [beneficiary, setBeneficiary] = useState(
    stored.beneficiary ?? authority,
  );
  const [designer, setDesigner] = useState(stored.designer ?? "");
  // F6: the duration typed in, or the one planned from the labour hours.
  const [months, setMonths] = useState(() =>
    clampMonths(stored.months ?? suggested.months),
  );
  // Whether the person set the duration, even to the one we planned.
  const [monthsChosen, setMonthsChosen] = useState(stored.months !== undefined);
  const [windows, setWindows] = useState<Windows>(() => stored.windows ?? {});
  // The offer form's validity and signer, the firm's last signer by default.
  const [offer, setOffer] = useState<OfferInput>(() => {
    const firm = readSigner(estimate.organizationId);
    return {
      validity: stored.validity === undefined ? "" : String(stored.validity),
      signer: stored.signer ?? firm.signer ?? "",
      role: stored.role ?? firm.role ?? "",
    };
  });
  const [error, setError] = useState<string>();
  const [downloading, setDownloading] = useState(false);

  const toggle = (kind: FormKind, on: boolean) => {
    const next = new Set(chosen);
    if (on) {
      next.add(kind);
    } else {
      next.delete(kind);
    }
    setChosen(next);
    setError(undefined);
  };

  // Where the person placed works other than we would, or placed works no
  // name placed, so the check knows they were looked at.
  const moved = useMemo(
    () =>
      Object.fromEntries(
        categories.flatMap((category): [string, Subchapter][] => {
          const subchapter = placement[category.key];
          return subchapter &&
            (subchapter !== category.guess || !category.hinted)
            ? [[category.key, subchapter]]
            : [];
        }),
      ),
    [categories, placement],
  );

  const shifted = shiftedWindows(categories, placement, windows, months);

  const chooseMonths = (next: number) => {
    setMonths(next);
    setMonthsChosen(true);
  };

  // What the offer form prints in its blanks.
  const offerOptions = useMemo(
    () => ({
      validity: validityDays(offer.validity),
      signer: offer.signer.trim() || undefined,
      role: offer.role.trim() || undefined,
    }),
    [offer],
  );

  // Who the forms will name, as the PDF falls back on the Deviz's own.
  const named = beneficiary.trim() || authority;
  const checks = useMemo(
    () =>
      checkForms(works, {
        kinds: formKinds.filter((kind) => chosen.has(kind)),
        withValues,
        subchapters: moved,
        beneficiary: named,
        months,
        monthsChosen,
        offer: offerOptions,
      }),
    [
      works,
      chosen,
      withValues,
      moved,
      named,
      months,
      monthsChosen,
      offerOptions,
    ],
  );
  const value = useMemo(
    () => (withValues ? offerValue(works, { subchapters: moved }) : undefined),
    [works, withValues, moved],
  );

  const focusField = (id: string) => {
    const field = document.getElementById(id);
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  };

  const fix = (check: FormCheck, action: CheckAction) => {
    switch (check.id) {
      case "placement":
        if (action === "keep") {
          setPlacement({
            ...placement,
            ...Object.fromEntries(
              categories
                .filter((category) =>
                  check.categories.some((one) => one.key === category.key),
                )
                .map((category) => [
                  category.key,
                  placedIn(placement, category),
                ]),
            ),
          });
        } else if (check.categories[0]) {
          focusField(`placement-${check.categories[0].key}`);
        }
        return;
      case "procurement":
        setChosen(new Set([...chosen, "F4", "F5"]));
        return;
      case "duration":
        if (action === "keep") {
          setMonthsChosen(true);
        } else {
          focusField("forms-months");
        }
        return;
      case "validity":
        focusField("forms-validity");
        return;
      case "signer":
        focusField(check.name ? "forms-role" : "forms-signer");
        return;
      case "beneficiary":
        focusField("forms-beneficiary");
        return;
    }
  };

  // F6's fields, which hold the duration when F6 is chosen.
  const schedule = chosen.has("F6") && categories.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const kinds = formKinds.filter((kind) => chosen.has(kind));
    if (kinds.length === 0) {
      setError(t("none"));
      return;
    }
    setDownloading(true);
    const done = await download(
      kinds,
      {
        withValues,
        resourceScope: scope,
        beneficiary: beneficiary.trim() || undefined,
        designer: designer.trim() || undefined,
        labels,
        subchapters: moved,
        schedule: { months, windows: shifted },
        offer: offerOptions,
      },
      t("fileTitle"),
    );
    setDownloading(false);
    if (done) {
      writeChoices(estimate._id, {
        kinds,
        labels: Object.fromEntries(
          Object.entries(labels).filter(([, label]) => label?.trim()),
        ),
        withValues,
        scope,
        subchapters: moved,
        // A beneficiary typed in, not the one the Deviz gives.
        beneficiary: beneficiary === authority ? undefined : beneficiary,
        designer: designer || undefined,
        // A duration the person set, not the one planned from the labour hours.
        months: monthsChosen ? months : undefined,
        windows: shifted,
        ...offerOptions,
      });
      // The firm's next Deviz starts with whoever signed this offer.
      if (kinds.includes("OF") && withValues && offerOptions.signer) {
        writeSigner(estimate.organizationId, offerOptions);
      }
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-body font-medium text-ink">
          {t("choose")}
        </legend>
        {formKinds.map((kind) => (
          <div
            key={kind}
            className="grid gap-2 rounded-md border border-border bg-card px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-0.5">
                <label
                  htmlFor={`form-${kind}`}
                  className="text-body font-medium text-ink"
                >
                  {t(`kinds.${kind}.title`)}
                </label>
                <p className="m-0 text-meta text-ink-3">
                  {t(`kinds.${kind}.hint`)}
                </p>
              </div>
              <Switch
                id={`form-${kind}`}
                checked={chosen.has(kind)}
                onCheckedChange={(on) => toggle(kind, on)}
              />
            </div>
            {renaming && chosen.has(kind) && (
              <Input
                aria-label={
                  kind === "OF" ? t("labelOffer") : t("label", { form: kind })
                }
                placeholder={defaultLabel(kind)}
                value={labels[kind] ?? ""}
                onChange={(event) =>
                  setLabels({ ...labels, [kind]: event.target.value })
                }
              />
            )}
          </div>
        ))}
        {error && (
          <p role="alert" className="m-0 text-meta text-danger">
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="link"
          className="justify-self-start"
          aria-expanded={renaming}
          onClick={() => setRenaming(!renaming)}
        >
          {renaming ? t("renameDone") : t("rename")}
        </Button>
      </fieldset>

      <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card px-4 py-3">
        <div className="grid gap-0.5">
          <label
            htmlFor="forms-values"
            className="text-body font-medium text-ink"
          >
            {t("withValues")}
          </label>
          <p className="m-0 text-meta text-ink-3">{t("withValuesHint")}</p>
        </div>
        <Switch
          id="forms-values"
          checked={withValues}
          onCheckedChange={setWithValues}
        />
      </div>

      {resourceForms.some((kind) => chosen.has(kind)) && (
        <Field label={t("scope")} hint={t("scopeHint")}>
          <SegmentedControl
            label={t("scope")}
            value={scope}
            onChange={setScope}
            options={[
              { value: "estimate", label: t("scopes.estimate") },
              { value: "object", label: t("scopes.object") },
              { value: "category", label: t("scopes.category") },
            ]}
          />
        </Field>
      )}

      {placedForms.some((kind) => chosen.has(kind)) &&
        categories.length > 0 && (
          <PlacementFields
            categories={categories}
            placement={placement}
            moved={Object.keys(moved).length > 0}
            onChange={setPlacement}
          />
        )}

      {schedule && (
        <ScheduleFields
          categories={categories}
          placement={placement}
          suggestedHours={suggested.hours}
          months={months}
          windows={windows}
          onMonths={chooseMonths}
          onWindows={setWindows}
        />
      )}

      {chosen.has("OF") && withValues && (
        <OfferFields
          offer={offer}
          deadline={estimate.tender?.deadline}
          onChange={setOffer}
        >
          {/* The offer form prints the duration F6 would. */}
          {!schedule && (
            <MonthsField
              suggestedHours={suggested.hours}
              months={months}
              onMonths={chooseMonths}
            />
          )}
        </OfferFields>
      )}

      <Field
        label={t("beneficiary")}
        htmlFor="forms-beneficiary"
        hint={t("beneficiaryHint")}
      >
        <Input
          id="forms-beneficiary"
          value={beneficiary}
          onChange={(event) => setBeneficiary(event.target.value)}
        />
      </Field>
      <Field
        label={t("designer")}
        htmlFor="forms-designer"
        hint={t("designerHint")}
      >
        <Input
          id="forms-designer"
          value={designer}
          onChange={(event) => setDesigner(event.target.value)}
        />
      </Field>

      <FormChecks checks={checks} value={value} onFix={fix} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={downloading}>
          {downloading && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("download")}
        </Button>
      </div>
    </form>
  );
}
