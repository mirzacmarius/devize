"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Estimate, Panel } from "./types";

type SectionPanel = Extract<Panel, { kind: "section" | "newSection" }>;

// Radix Select keeps "" for "nothing chosen", so "no object" needs a value.
const TOP = "top";

/** Adds an Obiect or a Capitol, or renames one. */
export function SectionDialog({
  estimate,
  panel,
  onClose,
}: {
  estimate: Estimate;
  panel: SectionPanel | null;
  onClose: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  // The last panel shown keeps the title while the dialog fades out.
  const [shown, setShown] = useState(panel);
  if (panel !== null && panel !== shown) {
    setShown(panel);
  }
  const current = panel ?? shown;
  const kind =
    current?.kind === "section" ? current.section.kind : current?.sectionKind;
  const title =
    current?.kind === "section"
      ? kind === "object"
        ? t("sections.renameObject")
        : t("sections.renameChapter")
      : kind === "object"
        ? t("sections.newObject")
        : t("sections.newChapter");
  return (
    <Dialog open={panel !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {kind === "object"
              ? t("sections.objectDescription")
              : t("sections.chapterDescription")}
          </DialogDescription>
        </DialogHeader>
        {panel && (
          <SectionForm estimate={estimate} panel={panel} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionForm({
  estimate,
  panel,
  onDone,
}: {
  estimate: Estimate;
  panel: SectionPanel;
  onDone: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const create = useMutation(api.estimates.sections.create);
  const update = useMutation(api.estimates.sections.update);
  const run = useRun();
  const existing = panel.kind === "section" ? panel.section : null;
  const kind =
    panel.kind === "section" ? panel.section.kind : panel.sectionKind;
  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [parentId, setParentId] = useState<Id<"sections"> | undefined>(
    panel.kind === "newSection" ? panel.parentId : undefined,
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const objects = estimate.sections.filter(
    (section) => section.kind === "object",
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("sections.nameRequired"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = existing
      ? await run(() =>
          update({
            sectionId: existing._id,
            name: name.trim(),
            code: code.trim(),
          }),
        )
      : await run(
          () =>
            create({
              estimateId: estimate._id,
              kind,
              name: name.trim(),
              code: code.trim() || undefined,
              parentId: kind === "chapter" ? parentId : undefined,
            }),
          t("sections.created", { name: name.trim() }),
        );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
        <Field label={t("sections.code")} htmlFor="section-code">
          <Input
            id="section-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={kind === "object" ? "01" : "1.1"}
            className="font-mono"
          />
        </Field>
        <Field label={t("sections.name")} htmlFor="section-name" error={error}>
          <Input
            id="section-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              kind === "object"
                ? t("sections.objectPlaceholder")
                : t("sections.chapterPlaceholder")
            }
            aria-invalid={error !== undefined}
            autoFocus
          />
        </Field>
      </div>
      {!existing && kind === "chapter" && objects.length > 0 && (
        <Field label={t("sections.parent")} htmlFor="section-parent">
          <Select
            value={parentId ?? TOP}
            onValueChange={(next) =>
              setParentId(next === TOP ? undefined : (next as Id<"sections">))
            }
          >
            <SelectTrigger id="section-parent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TOP}>{t("sections.topLevel")}</SelectItem>
              <SelectSeparator />
              {objects.map((object) => (
                <SelectItem key={object._id} value={object._id}>
                  {object.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {existing ? tc("save") : t("sections.add")}
        </Button>
      </div>
    </form>
  );
}
