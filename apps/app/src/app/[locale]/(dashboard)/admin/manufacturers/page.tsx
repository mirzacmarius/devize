"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Confidence,
  ErrorText,
  Field,
  manufacturerTone,
  NativeSelect,
  Panel,
  Pill,
  Textarea,
  useRun,
} from "../_components/ui";

const statuses = [
  "new",
  "review",
  "approved",
  "contacted",
  "replied",
  "norms_received",
  "declined",
  "excluded",
] as const;

type Status = (typeof statuses)[number];

export default function ManufacturersPage() {
  const t = useScopedI18n("admin.manufacturers");
  const tAdmin = useScopedI18n("admin");
  const tAdd = useScopedI18n("admin.manufacturers.add");
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<Status | "all">("all");
  const rows = useQuery(
    api.manufacturers.admin.list,
    status === "all" ? {} : { status },
  );
  // A single stage says nothing, so its column goes.
  const stages = new Set(rows?.map((row) => row.wave)).size;
  const [selected, setSelected] = useState<Set<Id<"manufacturers">>>(new Set());
  const [started, setStarted] = useState<number | null>(null);
  const startResearchMany = useMutation(
    api.manufacturers.admin.startResearchMany,
  );
  const { run, error, pending } = useRun();

  const toggle = (id: Id<"manufacturers">) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const research = () =>
    run(async () => {
      const count = await startResearchMany({ manufacturerIds: [...selected] });
      setStarted(count);
      setSelected(new Set());
    });

  return (
    <>
      {adding && <AddManufacturers />}

      <section className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="status_filter" className="sr-only">
            {t("columns.status")}
          </label>
          <NativeSelect
            id="status_filter"
            className="w-full sm:w-48"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Status | "all")
            }
          >
            <option value="all">{t("filterAll")}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {tAdmin(`status.manufacturer.${value}`)}
              </option>
            ))}
          </NativeSelect>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setAdding(!adding)}>
              <Plus aria-hidden />
              {tAdd("title")}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setSelected(
                  new Set(
                    (rows ?? [])
                      .filter((row) => row.status === "new" && !row.activeJob)
                      .map((row) => row._id),
                  ),
                )
              }
            >
              {t("selectNew")}
            </Button>
            {selected.size > 0 && (
              <Button disabled={pending} onClick={research}>
                {t("research", { count: selected.size })}
              </Button>
            )}
          </div>
        </div>
        <ErrorText error={error} />
        {started !== null && (
          <p className="m-0 text-body text-ink-2">
            {t("researchStarted", { count: started })}
          </p>
        )}
        {rows === undefined ? (
          <Loader2 className="size-5 animate-spin text-ink-3" />
        ) : rows.length === 0 ? (
          <p className="m-0 text-body text-ink-3">{t("empty")}</p>
        ) : (
          <Table className="min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">{t("selectNew")}</span>
                </TableHead>
                <TableHead>{t("columns.name")}</TableHead>
                {stages > 1 && <TableHead>{t("columns.wave")}</TableHead>}
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.norms")}</TableHead>
                <TableHead>{t("columns.confidence")}</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...rows]
                .sort((a, b) => a.wave - b.wave || a.name.localeCompare(b.name))
                .map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="w-8">
                      <span className="flex">
                        <input
                          type="checkbox"
                          aria-label={row.name}
                          checked={selected.has(row._id)}
                          onChange={() => toggle(row._id)}
                        />
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/manufacturers/${row._id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.hints && (
                        <p className="m-0 line-clamp-1 max-w-md text-meta text-ink-3">
                          {row.hints}
                        </p>
                      )}
                    </TableCell>
                    {stages > 1 && (
                      <TableCell className="tabular-nums text-ink-2">
                        {row.wave}
                      </TableCell>
                    )}
                    <TableCell>
                      {row.activeJob ? (
                        <Pill tone="active" dot={false}>
                          <Loader2 className="size-3 animate-spin self-center" />
                          {t("working")}
                        </Pill>
                      ) : (
                        <Pill tone={manufacturerTone[row.status]}>
                          {tAdmin(`status.manufacturer.${row.status}`)}
                        </Pill>
                      )}
                    </TableCell>
                    <TableCell className="text-ink-2">
                      {tAdmin(`status.norms.${row.normsStatus}`)}
                    </TableCell>
                    <TableCell className="text-ink-2">
                      {row.confidence && (
                        <Confidence>
                          {tAdmin(`confidenceLevel.${row.confidence}`)}
                        </Confidence>
                      )}
                    </TableCell>
                    <TableCell className="text-ink-2">
                      {/* A word, unless something stops it from going out. */}
                      {row.message &&
                        (row.message.blocked &&
                        row.message.status === "draft" ? (
                          <Pill tone="danger">
                            {tAdmin(`status.message.${row.message.status}`)}
                          </Pill>
                        ) : (
                          tAdmin(`status.message.${row.message.status}`)
                        ))}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}

function AddManufacturers() {
  const t = useScopedI18n("admin.manufacturers.add");
  const createMany = useMutation(api.manufacturers.admin.createMany);
  const [text, setText] = useState("");
  const [wave, setWave] = useState(1);
  const [result, setResult] = useState<{
    created: number;
    skipped: string[];
  } | null>(null);
  const { run, error, pending } = useRun();

  return (
    <Panel title={t("title")} description={t("description")}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            setResult(await createMany({ text, wave }));
            setText("");
          });
        }}
      >
        <label htmlFor="manufacturer_list" className="sr-only">
          {t("title")}
        </label>
        <Textarea
          id="manufacturer_list"
          rows={5}
          value={text}
          placeholder={t("placeholder")}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("wave")} htmlFor="manufacturer_wave">
            <NativeSelect
              id="manufacturer_wave"
              className="w-28"
              value={wave}
              onChange={(event) => setWave(Number(event.target.value))}
            >
              {[1, 2, 3].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button type="submit" disabled={pending || !text.trim()}>
            {t("submit")}
          </Button>
        </div>
        <ErrorText error={error} />
        {result && (
          <p className="text-body text-ink-2">
            {t("result", { created: result.created })}{" "}
            {result.skipped.length > 0 &&
              t("skipped", { names: result.skipped.join(", ") })}
          </p>
        )}
      </form>
    </Panel>
  );
}
