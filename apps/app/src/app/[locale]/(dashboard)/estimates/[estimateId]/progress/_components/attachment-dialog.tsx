"use client";

import { api } from "@devize/backend/convex/_generated/api";
import {
  attachmentRowQuantity,
  attachmentTotal,
} from "@devize/backend/convex/progress/arithmetic";
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
import { Switch } from "@devize/ui/switch";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useRun } from "@/components/use-run";
import {
  formatInputNumber,
  formatQuantity,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import type { StatementRow } from "./types";

type Line = {
  key: number;
  label: string;
  count: string;
  length: string;
  width: string;
  height: string;
  deduct: boolean;
};

let nextKey = 1;

function blankLine(): Line {
  nextKey += 1;
  return {
    key: nextKey,
    label: "",
    count: "1",
    length: "",
    width: "",
    height: "",
    deduct: false,
  };
}

/** A side as typed: a number, nothing, or undefined for something else. */
function parseSide(input: string): number | null | undefined {
  if (!input.trim()) {
    return null;
  }
  const value = parseDecimal(input);
  return value !== undefined && value >= 0 ? value : undefined;
}

/**
 * The Atașament of one Articol: the measurements behind the quantity
 * executed in the period, a line each, with what they add up to.
 */
export function AttachmentDialog({
  row,
  editable,
  onClose,
}: {
  row: StatementRow | null;
  // Whether the statement is still a draft; otherwise the lines just show.
  editable: boolean;
  onClose: () => void;
}) {
  const tc = useScopedI18n("common");
  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-3xl">
        {row && (
          <AttachmentForm
            key={row._id}
            row={row}
            editable={editable}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttachmentForm({
  row,
  editable,
  onDone,
}: {
  row: StatementRow;
  editable: boolean;
  onDone: () => void;
}) {
  const t = useScopedI18n("progress.attachment");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const setAttachment = useMutation(api.progress.statements.setAttachment);
  const [lines, setLines] = useState<Line[]>(() =>
    row.attachment.map((line) => {
      nextKey += 1;
      const side = (value: number | undefined) =>
        value === undefined ? "" : formatInputNumber(value, locale);
      return {
        key: nextKey,
        label: line.label ?? "",
        count: formatInputNumber(line.count, locale),
        length: side(line.length),
        width: side(line.width),
        height: side(line.height),
        deduct: line.deduct,
      };
    }),
  );
  // Whether the total becomes the quantity: yes unless a quantity typed by
  // hand would be overwritten.
  const [applyTotal, setApplyTotal] = useState(
    row.quantity === 0 || Math.abs(row.attachmentTotal - row.quantity) < 0.0005,
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const unit = formatUnit(row.unit, locale);

  const parsed = lines.map((line) => {
    const count = parseSide(line.count);
    const length = parseSide(line.length);
    const width = parseSide(line.width);
    const height = parseSide(line.height);
    if (
      count === undefined ||
      count === null ||
      length === undefined ||
      width === undefined ||
      height === undefined
    ) {
      return undefined;
    }
    return {
      label: line.label.trim() || undefined,
      count,
      length: length ?? undefined,
      width: width ?? undefined,
      height: height ?? undefined,
      deduct: line.deduct,
    };
  });
  const valid = parsed.filter(
    (line): line is NonNullable<typeof line> => line !== undefined,
  );
  const total = attachmentTotal(valid);

  const change = (key: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (parsed.some((line) => line === undefined)) {
      setError(t("invalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () => setAttachment({ rowId: row._id, rows: valid, applyTotal }),
      t("saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  const cell = "px-1 py-1";
  const head = "pb-1 px-1 text-left text-label uppercase text-ink-3";

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("title", { title: row.title })}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      {lines.length === 0 ? (
        <p className="m-0 text-body text-ink-2">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-body">
            <thead>
              <tr>
                <th className={head}>{t("label")}</th>
                <th className={head}>{t("count")}</th>
                <th className={head}>{t("length")}</th>
                <th className={head}>{t("width")}</th>
                <th className={head}>{t("height")}</th>
                <th className={`${head} text-center`}>{t("deduct")}</th>
                <th className={`${head} text-right`}>{t("result")}</th>
                <th className={head} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const value = parsed[index];
                return (
                  <tr key={line.key}>
                    <td className={cell}>
                      <Input
                        aria-label={t("label")}
                        value={line.label}
                        maxLength={200}
                        disabled={!editable}
                        onChange={(event) =>
                          change(line.key, { label: event.target.value })
                        }
                      />
                    </td>
                    {(["count", "length", "width", "height"] as const).map(
                      (side) => (
                        <td key={side} className={`${cell} w-24`}>
                          <Input
                            aria-label={t(side)}
                            inputMode="decimal"
                            autoComplete="off"
                            value={line[side]}
                            disabled={!editable}
                            className="text-right tabular-nums"
                            onChange={(event) =>
                              change(line.key, { [side]: event.target.value })
                            }
                          />
                        </td>
                      ),
                    )}
                    <td className={`${cell} text-center`}>
                      <Switch
                        checked={line.deduct}
                        disabled={!editable}
                        aria-label={t("deductLabel", { index: index + 1 })}
                        onCheckedChange={(deduct) =>
                          change(line.key, { deduct })
                        }
                      />
                    </td>
                    <td
                      className={`${cell} whitespace-nowrap text-right tabular-nums`}
                    >
                      {value
                        ? formatQuantity(attachmentRowQuantity(value), locale)
                        : "–"}
                    </td>
                    <td className={`${cell} text-right`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-ink-3"
                        disabled={!editable}
                        aria-label={t("remove", { index: index + 1 })}
                        onClick={() =>
                          setLines((current) =>
                            current.filter((item) => item.key !== line.key),
                          )
                        }
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!editable || lines.length >= 300}
          onClick={() => setLines((current) => [...current, blankLine()])}
        >
          {t("add")}
        </Button>
        <span className="text-body font-medium tabular-nums text-ink">
          {t("total")}: {formatQuantity(total, locale)} {unit}
        </span>
      </div>
      {error && (
        <p role="alert" className="m-0 text-meta text-danger">
          {error}
        </p>
      )}
      {editable && (
        <div className="flex items-center gap-2">
          <Switch
            id="attachment-apply"
            checked={applyTotal}
            onCheckedChange={setApplyTotal}
          />
          <label htmlFor="attachment-apply" className="text-meta text-ink-2">
            {t("applyTotal")}
          </label>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        {editable && (
          <Button type="submit" disabled={saving}>
            {saving && <Icons.Loader className="animate-spin" aria-hidden />}
            {t("save")}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
