"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc, Id } from "@devize/backend/convex/_generated/dataModel";
import type { WorksData } from "@devize/forms/sheet";
import type {
  ClosingMarkup,
  FillPlan,
  SheetChoice,
  SheetPlan,
  Workbook,
} from "@devize/forms/workbook";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { toast } from "@devize/ui/sonner";
import * as Sentry from "@sentry/nextjs";
import { useConvex, useQuery } from "convex/react";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { type Estimate, worksOf } from "./export-data";
import { shortTitle } from "./form-checks";
import { saveFile } from "./use-download-documents";

// The library that reads and writes the authority's file, which loads when
// the first one is opened.
type WorkbookModule = typeof import("@devize/forms/workbook");

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
// A select's value for writing no price in that column.
const NONE = "none";
// How many rows or positions to name before "și încă 3".
const NAMED = 5;

/** Whether a Deviz's file is a spreadsheet that came with its tender. */
function isTenderWorkbook(file: Doc<"files">): boolean {
  return (
    file.purpose === "tender" &&
    (/\.xlsx$/i.test(file.name) || file.contentType === XLSX_TYPE)
  );
}

const columnNumber = (letters: string) =>
  [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0);

/** Columns as a reader names them: "F–I" for a run of them, "F, H" otherwise. */
function columnRanges(columns: readonly string[]): string {
  const runs: string[][] = [];
  for (const column of [...new Set(columns)].sort(
    (a, b) => columnNumber(a) - columnNumber(b),
  )) {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (run && last && columnNumber(column) === columnNumber(last) + 1) {
      run.push(column);
    } else {
      runs.push([column]);
    }
  }
  return runs
    .map((run) => (run.length > 2 ? `${run[0]}–${run.at(-1)}` : run.join(", ")))
    .join(", ");
}

/** The authority's file name, without what file systems refuse. */
function baseName(name: string): string {
  return (
    name
      .replace(/\.xlsx$/i, "")
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100)
      .trim() || "lista"
  );
}

type Opened = {
  name: string;
  // The Deviz's stored file it was read from, if not one from the computer.
  fileId?: Id<"files">;
  module: WorkbookModule;
  workbook: Workbook;
};

type Reading =
  | { status: "idle" }
  | { status: "reading"; name: string; fileId?: Id<"files"> }
  | { status: "ready"; opened: Opened }
  | { status: "failed"; name: string; fileId?: Id<"files">; message: string };

/**
 * Fills the contracting authority's own spreadsheet of the tender's lists
 * with the Deviz's prices, in its layout, to hand back with the offer.
 */
export function TenderListSheet({
  estimate,
  open,
  onClose,
}: {
  estimate: Estimate;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("documents.list");
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
        {open && <TenderListForm estimate={estimate} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function TenderListForm({
  estimate,
  onDone,
}: {
  estimate: Estimate;
  onDone: () => void;
}) {
  const t = useScopedI18n("documents.list");
  const tc = useScopedI18n("common");
  const convex = useConvex();
  const errorMessage = useErrorMessage();
  const works = useMemo(() => worksOf(estimate), [estimate]);
  const files = useQuery(api.accounts.files.list, {
    organizationId: estimate.organizationId,
    estimateId: estimate._id,
  });
  const stored = useMemo(() => (files ?? []).filter(isTenderWorkbook), [files]);
  const [reading, setReading] = useState<Reading>({ status: "idle" });
  // What the person chose for each sheet, by its part's path.
  const [choices, setChoices] = useState<Record<string, SheetChoice>>({});
  const picker = useRef<HTMLInputElement>(null);
  // The last file asked for, so one read before it and finished late is
  // dropped.
  const latest = useRef(0);

  const opened = reading.status === "ready" ? reading.opened : undefined;
  // Where the Deviz's positions are in the file, as the Deviz is now.
  const plan = useMemo(
    () => opened?.module.planWorkbook(opened.workbook, works),
    [opened, works],
  );

  const read = async (
    name: string,
    bytes: () => Promise<ArrayBuffer>,
    fileId?: Id<"files">,
  ) => {
    const attempt = ++latest.current;
    setReading({ status: "reading", name, fileId });
    setChoices({});
    let module: WorkbookModule | undefined;
    try {
      module = await import("@devize/forms/workbook");
      const workbook = module.openWorkbook(new Uint8Array(await bytes()));
      if (attempt === latest.current) {
        setReading({
          status: "ready",
          opened: { name, fileId, module, workbook },
        });
      }
    } catch (error) {
      if (attempt !== latest.current) {
        return;
      }
      let message: string;
      if (module && error instanceof module.SpreadsheetError) {
        message = t("unreadable", { name });
      } else if (appErrorOf(error)) {
        message = errorMessage(error);
      } else {
        Sentry.captureException(error);
        message = t("failed");
      }
      setReading({ status: "failed", name, fileId, message });
    }
  };

  const readStored = (file: Doc<"files">) =>
    read(
      file.name,
      async () => {
        const url = await convex.query(api.accounts.files.getUrl, {
          fileId: file._id,
        });
        const response = url ? await fetch(url) : undefined;
        if (!response?.ok) {
          throw new Error(
            `Tender file ${file._id}: ${response?.status ?? "no URL"}`,
          );
        }
        return response.arrayBuffer();
      },
      file._id,
    );

  const readPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // So the same file can be picked again.
    event.target.value = "";
    if (file) {
      void read(file.name, () => file.arrayBuffer());
    }
  };

  // A tender with one spreadsheet opens it at once.
  const only = stored.length === 1 ? stored[0] : undefined;
  const autoOpened = useRef(false);
  useEffect(() => {
    if (only && !autoOpened.current) {
      autoOpened.current = true;
      void readStored(only);
    }
  });

  const download = () => {
    if (!opened || !plan) {
      return;
    }
    const name = `${t("fileName", { name: baseName(opened.name) })}.xlsx`;
    try {
      saveFile(
        opened.module.fillWorkbook(opened.workbook, plan, works, choices),
        name,
        XLSX_TYPE,
      );
      toast.success(t("downloaded", { name }));
    } catch (error) {
      Sentry.captureException(error);
      toast.error(t("saveFailed"));
    }
  };

  const busy = reading.status === "reading";

  return (
    <div className="grid gap-5">
      <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-body font-medium text-ink">
          {t("file")}
        </legend>
        {stored.map((file) => {
          const isOpen = opened?.fileId === file._id;
          return (
            <FileRow key={file._id} name={file.name}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || isOpen}
                onClick={() => readStored(file)}
              >
                {isOpen ? t("opened") : t("use")}
              </Button>
            </FileRow>
          );
        })}
        {opened && !opened.fileId && (
          <FileRow name={opened.name}>
            <Button type="button" variant="outline" size="sm" disabled>
              {t("opened")}
            </Button>
          </FileRow>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            {t("other")}
          </Button>
          <input
            ref={picker}
            type="file"
            accept={`.xlsx,${XLSX_TYPE}`}
            hidden
            onChange={readPicked}
          />
        </div>
        <p className="m-0 text-meta text-ink-3">{t("fileHint")}</p>
      </fieldset>

      {reading.status === "reading" && (
        <p
          role="status"
          className="m-0 flex items-center gap-2 text-meta text-ink-3"
        >
          <Icons.Loader className="size-4 animate-spin" aria-hidden />
          {t("reading", { name: reading.name })}
        </p>
      )}
      {reading.status === "failed" && (
        <p role="alert" className="m-0 text-meta text-danger">
          {reading.message}
        </p>
      )}
      {opened &&
        plan &&
        (plan.sheets.length === 0 ? (
          <p role="alert" className="m-0 text-meta text-danger">
            {t("none", { name: opened.name })}
          </p>
        ) : (
          <>
            {plan.sheets.map((sheet) => (
              <SheetFields
                key={sheet.path}
                module={opened.module}
                workbook={opened.workbook}
                sheet={sheet}
                data={works}
                choice={choices[sheet.path] ?? {}}
                onChoice={(choice) =>
                  setChoices({ ...choices, [sheet.path]: choice })
                }
              />
            ))}
            <Leftovers plan={plan} />
          </>
        ))}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("close")}
        </Button>
        <Button
          type="button"
          disabled={!plan || plan.sheets.length === 0}
          onClick={download}
        >
          {t("download")}
        </Button>
      </div>
    </div>
  );
}

function FileRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
      <span className="flex min-w-0 items-center gap-2.5 text-body text-ink">
        <Icons.Spreadsheet className="size-4 shrink-0 text-ink-3" aria-hidden />
        <span className="truncate">{name}</span>
      </span>
      {children}
    </div>
  );
}

/** One sheet's positions found, its price columns and its prices' basis. */
function SheetFields({
  module,
  workbook,
  sheet,
  data,
  choice,
  onChoice,
}: {
  module: WorkbookModule;
  workbook: Workbook;
  sheet: SheetPlan;
  data: WorksData;
  choice: SheetChoice;
  onChoice: (choice: SheetChoice) => void;
}) {
  const t = useScopedI18n("documents.list");
  const locale = useCurrentLocale();
  const columns = module.chosenColumns(sheet, choice);
  const basis = choice.basis ?? sheet.basis;
  const id = `list-${sheet.path.replace(/[^\w]+/g, "-")}`;
  // The Cote the sheet's Recapitulație adds, and those its prices carry.
  const added = module.addedMarkups(sheet);
  const carried = module.closingMarkups.filter(
    (markup) => basis === "inclusive" || !added.includes(markup),
  );
  const named = (markups: readonly ClosingMarkup[]) =>
    new Intl.ListFormat(locale, { type: "conjunction" }).format(
      markups.map((markup) => t(`markups.${markup}`)),
    );
  // The columns of a list that prices each kind on its own.
  const unitKinds = columnRanges(Object.values(columns.unitByKind));
  const totalKinds = columnRanges(Object.values(columns.totalByKind));
  const kinds =
    unitKinds && totalKinds
      ? t("kinds", { unit: unitKinds, total: totalKinds })
      : unitKinds
        ? t("kindsUnit", { columns: unitKinds })
        : totalKinds && t("kindsTotal", { columns: totalKinds });
  const basisHint =
    carried.length === module.closingMarkups.length
      ? [t("basisInclusive"), added.length > 0 && t("basisInclusiveRows")]
      : [
          t("basisDirect", { added: named(added) }),
          carried.length > 0 && t("basisCarried", { carried: named(carried) }),
        ];
  const unpriced = sheet.unpriced
    .slice(0, NAMED)
    .map((row) =>
      row.position
        ? t("unpricedPosition", { row: row.row, position: row.position })
        : t("unpricedRow", { row: row.row }),
    )
    .join(", ");
  const unpricedMore = sheet.unpriced.length - NAMED;
  const formulas = module.formulaRows(workbook, sheet, choice);

  const columnField = (key: "unitPrice" | "total", label: string) => (
    <Field label={label} htmlFor={`${id}-${key}`}>
      <Select
        value={columns[key] ?? NONE}
        onValueChange={(next) =>
          onChoice({ ...choice, [key]: next === NONE ? null : next })
        }
      >
        <SelectTrigger id={`${id}-${key}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t("noColumn")}</SelectItem>
          {sheet.choices.map((option) => (
            <SelectItem key={option.column} value={option.column}>
              {option.header
                ? t("columnHeader", {
                    column: option.column,
                    header: shortTitle(option.header),
                  })
                : t("column", { column: option.column })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 gap-3 rounded-md border border-border bg-card px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={id} className="m-0 min-w-0 text-body font-medium text-ink">
          {t("sheet", { name: sheet.name })}
        </h3>
        <span className="shrink-0 text-meta text-ink-3">
          {t("found", { count: sheet.positions.length })}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
        {columnField("unitPrice", t("unitPrice"))}
        {columnField("total", t("total"))}
      </div>
      {sheet.guessed && (
        <p className="m-0 text-meta text-warning">{t("guessed")}</p>
      )}
      {kinds && <p className="m-0 text-meta text-ink-3">{kinds}</p>}
      {sheet.details.length > 0 && (
        <p className="m-0 text-meta text-ink-3">{t("details")}</p>
      )}
      {added.length > 0 ? (
        <Field label={t("basis")} hint={basisHint.filter(Boolean).join(" ")}>
          <SegmentedControl
            label={t("basis")}
            value={basis}
            onChange={(next) => onChoice({ ...choice, basis: next })}
            options={[
              { value: "direct", label: t("bases.direct") },
              { value: "inclusive", label: t("bases.inclusive") },
            ]}
          />
        </Field>
      ) : (
        // Without rows for the Cote, the prices carry them either way.
        <p className="m-0 text-meta text-ink-3">{t("basisInclusive")}</p>
      )}
      <p className="m-0 text-body font-medium tabular-nums text-ink">
        {t("sheetTotal", {
          amount: formatMoney(module.sheetTotal(sheet, data, basis), locale),
        })}
      </p>
      {formulas.length > 0 && (
        <p className="m-0 text-meta text-warning">
          {t("formulas", { rows: formulas.join(", ") })}
        </p>
      )}
      {unpriced && (
        <p className="m-0 text-meta text-ink-3">
          {t("unpriced", {
            rows:
              unpricedMore > 0
                ? `${unpriced} ${t("more", { count: unpricedMore })}`
                : unpriced,
          })}
        </p>
      )}
    </section>
  );
}

/** The Deviz's positions the file hasn't, and its Articole no list has. */
function Leftovers({ plan }: { plan: FillPlan }) {
  const t = useScopedI18n("documents.list");
  if (plan.missing.length === 0 && plan.extra.length === 0) {
    return null;
  }
  const more = plan.missing.length - NAMED;
  return (
    <section className="grid gap-2 rounded-md bg-muted px-3 py-3">
      {plan.missing.length > 0 && (
        <div className="grid gap-1">
          <p className="m-0 text-meta font-medium text-ink">
            {t("missing", { count: plan.missing.length })}
          </p>
          <ul className="m-0 grid list-none gap-0.5 p-0 text-meta text-ink-2">
            {plan.missing.slice(0, NAMED).map((item) => (
              <li key={item.lineItemId}>
                {t("missingItem", {
                  position: item.position,
                  text: shortTitle(item.text),
                })}
              </li>
            ))}
            {more > 0 && <li>{t("more", { count: more })}</li>}
          </ul>
          <p className="m-0 text-meta text-ink-3">{t("missingHint")}</p>
        </div>
      )}
      {plan.extra.length > 0 && (
        <p className="m-0 text-meta text-ink-3">
          {t("extra", { count: plan.extra.length })}
        </p>
      )}
    </section>
  );
}
