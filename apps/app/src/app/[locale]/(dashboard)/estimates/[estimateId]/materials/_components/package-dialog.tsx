"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { PackageKind } from "@devize/backend/convex/materials/packages";
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
import { Input } from "@devize/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useRun } from "@/components/use-run";
import { formatInputNumber, formatUnit, parseDecimal } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { ListRow } from "./types";

const kinds: readonly PackageKind[] = [
  "bag",
  "box",
  "roll",
  "bucket",
  "can",
  "pack",
  "sheet",
  "bar",
  "cartridge",
  "set",
  "piece",
];

/** Reads "15; 5" or "15 / 5" as sizes; undefined when one isn't a number. */
function parseSizes(input: string): number[] | undefined {
  const parts = input
    .split(/[;/]|\s+(?=\d)/)
    .map((part) => part.trim())
    .filter(Boolean);
  const sizes = parts.map((part) => parseDecimal(part));
  if (
    sizes.length === 0 ||
    sizes.some((size) => size === undefined || !(size > 0))
  ) {
    return undefined;
  }
  return sizes as number[];
}

/**
 * What the firm buys a material in, kept for all its devize: the kind of
 * package and one or more sizes, in the material's unit.
 */
export function PackageDialog({
  organizationId,
  row,
  onClose,
}: {
  organizationId: Id<"organizations">;
  row: ListRow | null;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-md">
        {row && (
          <PackageForm
            key={row.key}
            organizationId={organizationId}
            row={row}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PackageForm({
  organizationId,
  row,
  onDone,
}: {
  organizationId: Id<"organizations">;
  row: ListRow;
  onDone: () => void;
}) {
  const t = useScopedI18n("materials.package");
  const tKinds = useScopedI18n("materials.kinds");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const setPackage = useMutation(api.materials.packagings.setPackage);
  const clearPackage = useMutation(api.materials.packagings.clearPackage);
  const run = useRun();
  // The package the list uses now, to correct rather than type again.
  const current = row.package ?? row.typical;
  const [kind, setKind] = useState<PackageKind>(current?.kind ?? "bag");
  const [sizes, setSizes] = useState(() =>
    (current?.sizes ?? [])
      .map((size) => formatInputNumber(size, locale))
      .join("; "),
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const unit = formatUnit(row.unit, locale);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseSizes(sizes);
    if (!parsed) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        setPackage({
          organizationId,
          key: row.key,
          unit: row.unit,
          kind,
          sizes: parsed,
        }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  const reset = async () => {
    setSaving(true);
    const result = await run(
      () => clearPackage({ organizationId, key: row.key }),
      t("cleared"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("title", { name: row.name })}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("kind")} htmlFor="package-kind">
          <Select
            value={kind}
            onValueChange={(next) => setKind(next as PackageKind)}
          >
            <SelectTrigger id="package-kind" className="capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((option) => (
                <SelectItem key={option} value={option} className="capitalize">
                  {tKinds(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={`${t("sizes")} (${unit})`}
          htmlFor="package-sizes"
          hint={t("sizesHint")}
          error={error}
        >
          <Input
            id="package-sizes"
            inputMode="decimal"
            autoComplete="off"
            value={sizes}
            onChange={(event) => setSizes(event.target.value)}
            required
          />
        </Field>
      </div>
      <DialogFooter>
        {row.package?.source === "firm" && (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto"
            disabled={saving}
            onClick={reset}
          >
            {t("reset")}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
