"use client";

import type { ResourceScope } from "@devize/forms";
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
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useScopedI18n } from "@/locales/client";
import type { Estimate } from "./export-data";
import { useDownloadDocuments } from "./use-download-documents";

// The official forms one PDF can hold, in the order they print.
const formKinds = ["F3", "C5", "C6", "C7", "C8", "C9"] as const;
type FormKind = (typeof formKinds)[number];
const resourceForms: readonly FormKind[] = ["C6", "C7", "C8", "C9"];

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
      <SheetContent closeLabel={tc("close")} className="overflow-y-auto">
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
  const [chosen, setChosen] = useState<ReadonlySet<FormKind>>(
    new Set(["F3", "C6", "C7", "C8", "C9"]),
  );
  const [labels, setLabels] = useState<Partial<Record<FormKind, string>>>({});
  const [renaming, setRenaming] = useState(false);
  const [withValues, setWithValues] = useState(true);
  const [scope, setScope] = useState<ResourceScope>("object");
  // Who the forms are for, as they will print unless changed.
  const [beneficiary, setBeneficiary] = useState(
    (estimate.kind === "tender" && estimate.tender?.authority) ||
      estimate.client?.name ||
      "",
  );
  const [designer, setDesigner] = useState("");
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
      },
      t("fileTitle"),
    );
    setDownloading(false);
    if (done) {
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
                placeholder={`Formularul ${kind}`}
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
