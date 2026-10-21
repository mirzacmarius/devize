"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  confidenceTone,
  ErrorText,
  Field,
  manufacturerTone,
  messageTone,
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
  const [status, setStatus] = useState<Status | "all">("all");
  const rows = useQuery(
    api.manufacturers.admin.list,
    status === "all" ? {} : { status },
  );
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
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium text-primary/80">{t("title")}</h1>
        <p className="text-base text-primary/60">{t("description")}</p>
      </div>

      <AddManufacturers />

      <Panel
        title={t("title")}
        actions={
          <>
            <label htmlFor="status_filter" className="sr-only">
              {t("columns.status")}
            </label>
            <NativeSelect
              id="status_filter"
              className="w-48"
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
            <Button
              size="sm"
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
            <Button
              size="sm"
              disabled={selected.size === 0 || pending}
              onClick={research}
            >
              {t("research", { count: selected.size })}
            </Button>
          </>
        }
      >
        <ErrorText error={error} />
        {started !== null && (
          <p className="text-sm text-primary/70">
            {t("researchStarted", { count: started })}
          </p>
        )}
        {rows === undefined ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-primary/60">{t("empty")}</p>
        ) : (
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-primary/50">
                <tr>
                  <th className="w-10 px-6 py-2">
                    <span className="sr-only">{t("selectNew")}</span>
                  </th>
                  <th className="py-2 pr-4">{t("columns.name")}</th>
                  <th className="py-2 pr-4">{t("columns.wave")}</th>
                  <th className="py-2 pr-4">{t("columns.status")}</th>
                  <th className="py-2 pr-4">{t("columns.norms")}</th>
                  <th className="py-2 pr-4">{t("columns.confidence")}</th>
                  <th className="py-2 pr-6">{t("columns.email")}</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort(
                    (a, b) => a.wave - b.wave || a.name.localeCompare(b.name),
                  )
                  .map((row) => (
                    <tr
                      key={row._id}
                      className="border-b border-border last:border-0 hover:bg-primary/[0.02]"
                    >
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          aria-label={row.name}
                          checked={selected.has(row._id)}
                          onChange={() => toggle(row._id)}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/manufacturers/${row._id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                        {row.hints && (
                          <p className="line-clamp-1 max-w-md text-xs text-primary/50">
                            {row.hints}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-primary/70">{row.wave}</td>
                      <td className="py-3 pr-4">
                        {row.activeJob ? (
                          <Pill tone="info">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t("working")}
                          </Pill>
                        ) : (
                          <Pill tone={manufacturerTone[row.status]}>
                            {tAdmin(`status.manufacturer.${row.status}`)}
                          </Pill>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-primary/70">
                        {tAdmin(`status.norms.${row.normsStatus}`)}
                      </td>
                      <td className="py-3 pr-4">
                        {row.confidence && (
                          <Pill tone={confidenceTone[row.confidence]}>
                            {tAdmin(`confidence.${row.confidence}`)}
                          </Pill>
                        )}
                      </td>
                      <td className="py-3 pr-6">
                        {row.message && (
                          <Pill
                            tone={
                              row.message.blocked &&
                              row.message.status === "draft"
                                ? "danger"
                                : messageTone[row.message.status]
                            }
                          >
                            {tAdmin(`status.message.${row.message.status}`)}
                          </Pill>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
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
          <p className="text-sm text-primary/70">
            {t("result", { created: result.created })}{" "}
            {result.skipped.length > 0 &&
              t("skipped", { names: result.skipped.join(", ") })}
          </p>
        )}
      </form>
    </Panel>
  );
}
