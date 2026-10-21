"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { isPercentUnit } from "@devize/backend/convex/lib/text";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { PageHeader } from "@devize/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { Textarea } from "@devize/ui/textarea";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { ResourcePicker } from "@/components/resource-picker";
import { useRun } from "@/components/use-run";
import {
  formatInputNumber,
  formatMoney,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import {
  costByKind,
  type ResourceKind,
  resourceKinds,
} from "@/lib/resource-values";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { Norm } from "../[normId]/_components/types";

// Units norms are usually measured in, and those their resources use.
const normUnits = ["mp", "mc", "m", "buc", "kg", "t", "set"];
const resourceUnits = [
  "kg",
  "mp",
  "mc",
  "m",
  "buc",
  "l",
  "t",
  "sac",
  "rola",
  "set",
  "ora",
  "zi",
  "%",
];

type Row = {
  id: string;
  kind: ResourceKind;
  name: string;
  unit: string;
  quantity: string;
  price: string;
  resourceId?: Id<"resources">;
  productId?: Id<"products">;
  note?: string;
  // The field to focus when the row first shows: a new row's name, or the
  // consumption of a resource picked from the catalog.
  focus?: "name" | "quantity";
};

let nextRow = 0;
const emptyRow = (kind: ResourceKind = "material"): Row => ({
  id: `row-${++nextRow}`,
  kind,
  name: "",
  unit: "",
  quantity: "",
  price: "",
});

const isBlank = (row: Row) =>
  !row.name.trim() && !row.unit.trim() && !row.quantity.trim() && !row.price;

/** A row's first field that keeps it from being saved. */
function invalidField(row: Row) {
  const quantity = parseDecimal(row.quantity);
  const price = parseDecimal(row.price);
  if (!row.name.trim()) {
    return "name";
  }
  if (!row.unit.trim()) {
    return "unit";
  }
  if (quantity === undefined || quantity < 0) {
    return "quantity";
  }
  // A "%" row has no price, whatever was typed before.
  if (
    !isPercentUnit(row.unit) &&
    row.price.trim() &&
    (price === undefined || price < 0)
  ) {
    return "price";
  }
  return undefined;
}

/**
 * Writes a firm's own norm, or changes a draft: its code, name and unit, the
 * resources one unit of work consumes and what the work covers. The
 * reference cost of a unit follows the rows as they change.
 */
export function NormForm({ norm }: { norm?: Norm }) {
  const t = useScopedI18n("norm");
  const tc = useScopedI18n("common");
  const tCatalog = useScopedI18n("catalog");
  const tKinds = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const router = useRouter();
  const run = useRun();
  const ids = useId();
  const { firm } = useFirm();
  const create = useMutation(api.catalog.norms.create);
  const update = useMutation(api.catalog.norms.update);
  const [code, setCode] = useState(norm?.code ?? "");
  const [title, setTitle] = useState(norm?.title ?? "");
  const [unit, setUnit] = useState(norm?.unit ?? "");
  const [category, setCategory] = useState(norm?.category ?? "");
  const [includes, setIncludes] = useState(norm?.includes ?? "");
  const [excludes, setExcludes] = useState(norm?.excludes ?? "");
  const [measurement, setMeasurement] = useState(norm?.measurement ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    norm && norm.resources.length > 0
      ? norm.resources.map((resource) => ({
          ...emptyRow(resource.kind),
          name: resource.name,
          unit: resource.unit,
          quantity: formatInputNumber(resource.quantity, locale),
          price:
            resource.referencePrice === undefined
              ? ""
              : formatInputNumber(resource.referencePrice, locale),
          resourceId: resource.resourceId,
          productId: resource.productId,
          note: resource.note,
        }))
      : [emptyRow()],
  );
  const [errors, setErrors] = useState<{
    code?: string;
    title?: string;
    unit?: string;
    resources?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const back = norm ? `/catalog/${norm._id}` : "/catalog?view=own";

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const filled = rows.filter((row) => !isBlank(row));
    const broken = filled.find((row) => invalidField(row) !== undefined);
    const found = {
      code: code.trim() ? undefined : t("form.codeRequired"),
      title: title.trim() ? undefined : t("form.titleRequired"),
      unit: !unit.trim()
        ? t("form.unitRequired")
        : isPercentUnit(unit)
          ? t("form.unitPercent")
          : undefined,
      resources: broken ? t("form.rowInvalid") : undefined,
    };
    setErrors(found);
    // The first field to fix, in the order they show.
    const fix = found.code
      ? `${ids}-code`
      : found.unit
        ? `${ids}-unit`
        : found.title
          ? `${ids}-title`
          : broken && `${ids}-${broken.id}-${invalidField(broken)}`;
    if (fix) {
      document.getElementById(fix)?.focus();
      return;
    }
    const list = filled.map((row) => ({
      kind: row.kind,
      name: row.name.trim(),
      unit: row.unit.trim(),
      quantity: parseDecimal(row.quantity) ?? 0,
      referencePrice: isPercentUnit(row.unit)
        ? undefined
        : parseDecimal(row.price),
      resourceId: row.resourceId,
      productId: row.productId,
      note: row.note,
    }));
    const fields = {
      code: code.trim(),
      title: title.trim(),
      unit: unit.trim(),
      category: category.trim(),
      includes: includes.trim(),
      excludes: excludes.trim(),
      measurement: measurement.trim(),
      resources: list,
    };
    setSaving(true);
    if (norm) {
      const result = await run(
        () => update({ normId: norm._id, ...fields }),
        t("form.saved"),
      );
      setSaving(false);
      if (result.ok) {
        router.push(`/catalog/${norm._id}`);
      }
      return;
    }
    const result = await run(
      () =>
        create({
          source: "organization",
          organizationId: firm._id,
          ...fields,
          category: fields.category || undefined,
          includes: fields.includes || undefined,
          excludes: fields.excludes || undefined,
          measurement: fields.measurement || undefined,
        }),
      t("form.created"),
    );
    setSaving(false);
    if (result.ok) {
      router.push(`/catalog/${result.value}`);
    }
  };

  // What a unit of work costs at the prices typed so far.
  const cost = costByKind(
    rows
      .filter((row) => !isBlank(row))
      .map((row) => ({
        kind: row.kind,
        unit: row.unit.trim(),
        quantity: parseDecimal(row.quantity) ?? 0,
        price: parseDecimal(row.price),
      })),
  );
  const columns = {
    kind: t("form.columns.kind"),
    name: t("form.columns.name"),
    unit: t("form.columns.unit"),
    quantity: t("form.columns.quantity"),
    price: t("form.columns.price"),
  };

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={t("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/catalog?view=own">{tCatalog("title")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            {norm ? (
              <>
                <BreadcrumbLink asChild>
                  <Link href={`/catalog/${norm._id}`}>{norm.code}</Link>
                </BreadcrumbLink>
                <BreadcrumbSeparator />
                <BreadcrumbPage>{t("actions.edit")}</BreadcrumbPage>
              </>
            ) : (
              <BreadcrumbPage>{t("form.newTitle")}</BreadcrumbPage>
            )}
          </Breadcrumb>
        }
        title={
          norm ? t("form.editTitle", { code: norm.code }) : t("form.newTitle")
        }
        description={
          norm
            ? norm.version > 1
              ? t("actions.versionOpened", { version: norm.version })
              : t("form.editDescription")
            : t("form.newDescription")
        }
      />
      <form className="grid max-w-4xl gap-6" onSubmit={submit} noValidate>
        <Card>
          <CardContent className="gap-5 pt-5">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
              <Field
                label={t("form.code")}
                htmlFor={`${ids}-code`}
                error={errors.code}
                hint={t("form.codeHint")}
              >
                <Input
                  id={`${ids}-code`}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={t("form.codePlaceholder")}
                  className="font-mono"
                  maxLength={40}
                  aria-invalid={errors.code !== undefined}
                  autoFocus={!norm}
                />
              </Field>
              <Field
                label={t("form.unit")}
                htmlFor={`${ids}-unit`}
                error={errors.unit}
              >
                <Input
                  id={`${ids}-unit`}
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="mp"
                  list={`${ids}-norm-units`}
                  aria-invalid={errors.unit !== undefined}
                />
              </Field>
              <Field label={t("form.category")} htmlFor={`${ids}-category`}>
                <Input
                  id={`${ids}-category`}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder={t("form.categoryPlaceholder")}
                />
              </Field>
            </div>
            <Field
              label={t("form.title")}
              htmlFor={`${ids}-title`}
              error={errors.title}
            >
              <Input
                id={`${ids}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("form.titlePlaceholder")}
                maxLength={500}
                aria-invalid={errors.title !== undefined}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="grid justify-stretch gap-1">
            <CardTitle>{t("form.resources")}</CardTitle>
            <CardDescription>{t("form.resourcesHint")}</CardDescription>
          </CardHeader>
          <TickRule />
          <CardContent className="pt-4">
            {rows.length === 0 ? (
              <p className="m-0 text-body text-ink-3">
                {t("form.noResources")}
              </p>
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0">
                {rows.map((row, index) => {
                  const label = (
                    key: keyof typeof columns,
                    className?: string,
                  ) => ({
                    label: columns[key],
                    htmlFor: `${ids}-${row.id}-${key}`,
                    // The first row's labels head the columns on wide screens.
                    className: cn(
                      index > 0 && "sm:[&>label]:sr-only",
                      className,
                    ),
                  });
                  // Marked once a save found the row incomplete.
                  const problem = errors.resources
                    ? invalidField(row)
                    : undefined;
                  return (
                    <li
                      key={row.id}
                      // On a phone: the kind, the name, then the numbers
                      // side by side.
                      className="grid grid-cols-3 items-end gap-2 rounded-md border border-border bg-sunken p-3 sm:grid-cols-[130px_minmax(0,1fr)_80px_100px_110px_36px] sm:border-0 sm:bg-transparent sm:p-0"
                    >
                      <Field {...label("kind", "col-span-2 sm:col-span-1")}>
                        <Select
                          value={row.kind}
                          onValueChange={(value) =>
                            updateRow(row.id, {
                              kind: value as ResourceKind,
                              resourceId: undefined,
                              productId: undefined,
                            })
                          }
                        >
                          <SelectTrigger id={`${ids}-${row.id}-kind`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {resourceKinds.map((kind) => (
                              <SelectItem key={kind} value={kind}>
                                {tKinds(`kinds.${kind}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field {...label("name", "col-span-3 sm:col-span-1")}>
                        <Input
                          id={`${ids}-${row.id}-name`}
                          value={row.name}
                          autoFocus={row.focus === "name"}
                          aria-invalid={problem === "name"}
                          onChange={(event) =>
                            updateRow(row.id, {
                              name: event.target.value,
                              resourceId: undefined,
                              productId: undefined,
                            })
                          }
                        />
                      </Field>
                      <Field {...label("unit")}>
                        <Input
                          id={`${ids}-${row.id}-unit`}
                          value={row.unit}
                          list={`${ids}-resource-units`}
                          aria-invalid={problem === "unit"}
                          onChange={(event) =>
                            updateRow(row.id, {
                              unit: event.target.value,
                              resourceId: undefined,
                              productId: undefined,
                            })
                          }
                        />
                      </Field>
                      <Field {...label("quantity")}>
                        <DecimalInput
                          id={`${ids}-${row.id}-quantity`}
                          value={row.quantity}
                          autoFocus={row.focus === "quantity"}
                          aria-invalid={problem === "quantity"}
                          onChange={(event) =>
                            updateRow(row.id, { quantity: event.target.value })
                          }
                        />
                      </Field>
                      <Field {...label("price")}>
                        <DecimalInput
                          id={`${ids}-${row.id}-price`}
                          value={isPercentUnit(row.unit) ? "" : row.price}
                          disabled={isPercentUnit(row.unit)}
                          aria-invalid={problem === "price"}
                          onChange={(event) =>
                            updateRow(row.id, { price: event.target.value })
                          }
                        />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="col-start-3 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto"
                        aria-label={t("form.removeRow", {
                          name: row.name || tKinds(`kinds.${row.kind}`),
                        })}
                        onClick={() =>
                          setRows((current) =>
                            current.filter((other) => other.id !== row.id),
                          )
                        }
                      >
                        <X aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setRows((current) => [
                    ...current,
                    { ...emptyRow(), focus: "name" },
                  ])
                }
              >
                <Plus aria-hidden />
                {t("form.addRow")}
              </Button>
              <ResourcePicker
                onPick={(resource) =>
                  setRows((current) => [
                    // A row still empty makes room for the one picked.
                    ...current.filter((row) => !isBlank(row)),
                    {
                      ...emptyRow(resource.kind),
                      focus: "quantity",
                      name: resource.name,
                      unit: resource.unit,
                      price:
                        resource.referencePrice === undefined
                          ? ""
                          : formatInputNumber(resource.referencePrice, locale),
                      resourceId: resource._id,
                    },
                  ])
                }
              />
            </div>
            {errors.resources && (
              <p role="alert" className="m-0 text-meta text-danger">
                {errors.resources}
              </p>
            )}
            <p className="m-0 rounded-md bg-sunken px-4 py-3 text-body text-ink-2 tabular-nums">
              {unit.trim()
                ? t("form.referenceCost", {
                    value: formatMoney(cost.total, locale),
                    unit: formatUnit(unit.trim(), locale),
                  })
                : t("form.referenceCostNoUnit", {
                    value: formatMoney(cost.total, locale),
                  })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("form.scope")}</CardTitle>
          </CardHeader>
          <TickRule />
          <CardContent className="gap-5 pt-4">
            <Field label={t("form.includes")} htmlFor={`${ids}-includes`}>
              <Textarea
                id={`${ids}-includes`}
                value={includes}
                onChange={(event) => setIncludes(event.target.value)}
                placeholder={t("form.includesPlaceholder")}
              />
            </Field>
            <Field label={t("form.excludes")} htmlFor={`${ids}-excludes`}>
              <Textarea
                id={`${ids}-excludes`}
                value={excludes}
                onChange={(event) => setExcludes(event.target.value)}
                placeholder={t("form.excludesPlaceholder")}
              />
            </Field>
            <Field label={t("form.measurement")} htmlFor={`${ids}-measurement`}>
              <Textarea
                id={`${ids}-measurement`}
                value={measurement}
                onChange={(event) => setMeasurement(event.target.value)}
                placeholder={t("form.measurementPlaceholder")}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" asChild>
            <Link href={back}>{tc("cancel")}</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Icons.Loader className="animate-spin" aria-hidden />}
            {t("form.save")}
          </Button>
        </div>
      </form>
      <datalist id={`${ids}-norm-units`}>
        {normUnits.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id={`${ids}-resource-units`}>
        {resourceUnits.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
