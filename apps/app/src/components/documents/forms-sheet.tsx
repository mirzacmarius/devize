"use client";

import {
  clampMonths,
  type DocumentKind,
  defaultLabel,
  documentKinds,
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
import { type Placement, PlacementFields, placedIn } from "./placement-fields";
import {
  ScheduleFields,
  shiftedWindows,
  type Windows,
} from "./schedule-fields";
import { readChoices, writeChoices } from "./stored-choices";
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
 * The forms a tender usually asks of a bidder: the financial offer's F1–F3,
 * F4 and F5 when the works buy equipment or furnishings, and the resource
 * lists.
 */
function offerKinds(
  categories: readonly SheetCategory[],
  placement: Placement,
): Set<FormKind> {
  const kinds = new Set<FormKind>(["F1", "F2", "F3", "C6", "C7", "C8", "C9"]);
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
  const categories = useMemo(
    () => sheetCategories(worksOf(estimate)),
    [estimate],
  );
  const suggested = useMemo(
    () => suggestedMonths(worksOf(estimate)),
    [estimate],
  );
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
  const [windows, setWindows] = useState<Windows>(() => stored.windows ?? {});
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

  // Only where the person placed works other than we would.
  const moved = Object.fromEntries(
    categories.flatMap((category): [string, Subchapter][] => {
      const subchapter = placement[category.key];
      return subchapter && subchapter !== category.guess
        ? [[category.key, subchapter]]
        : [];
    }),
  );

  const shifted = shiftedWindows(categories, placement, windows, months);

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
        // A duration typed in, not the one planned from the labour hours.
        months: months === suggested.months ? undefined : months,
        windows: shifted,
      });
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
                aria-label={t("label", { form: kind })}
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

      {chosen.has("F6") && categories.length > 0 && (
        <ScheduleFields
          categories={categories}
          placement={placement}
          suggestedHours={suggested.hours}
          months={months}
          windows={windows}
          onMonths={setMonths}
          onWindows={setWindows}
        />
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
