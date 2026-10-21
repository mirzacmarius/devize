"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ErrorText, Panel, Pill, type Tone, useRun } from "../_components/ui";

type Status = FunctionReturnType<typeof api.catalog.baseCatalog.status>;
type Row = Status["norms"][number];

const stateTone: Record<Row["state"], Tone> = {
  new: "info",
  changed: "warning",
  unchanged: "success",
};

/**
 * Devize's own base norms, which ship with the code: what publishing this
 * edition would add or change, and the button that publishes it.
 */
export default function AdminCatalogPage() {
  const t = useScopedI18n("admin.catalog");
  const status = useQuery(api.catalog.baseCatalog.status);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium text-primary/80">{t("title")}</h1>
        <p className="text-base text-primary/60">{t("description")}</p>
      </div>
      {status === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      ) : (
        <>
          <EditionPanel status={status} />
          <NormsPanel norms={status.norms} />
        </>
      )}
    </div>
  );
}

function EditionPanel({ status }: { status: Status }) {
  const t = useScopedI18n("admin.catalog");
  const publish = useMutation(api.catalog.baseCatalog.publish);
  const { run, error, pending } = useRun();
  const count = (state: Row["state"]) =>
    status.norms.filter((norm) => norm.state === state).length;
  const waiting = count("new") + count("changed");

  return (
    <Panel
      title={t("edition", { edition: status.edition })}
      description={t("editionDescription")}
      actions={
        <Button
          size="sm"
          disabled={pending || waiting === 0}
          onClick={() => run(() => publish({}))}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("publish")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={stateTone.new}>
          {t("counts.new", { count: count("new") })}
        </Pill>
        <Pill tone={stateTone.changed}>
          {t("counts.changed", { count: count("changed") })}
        </Pill>
        <Pill tone={stateTone.unchanged}>
          {t("counts.unchanged", { count: count("unchanged") })}
        </Pill>
      </div>
      <p className="text-sm text-primary/60">
        {waiting === 0 ? t("upToDate") : t("waiting")}
      </p>
      <ErrorText error={error} />
    </Panel>
  );
}

function NormsPanel({ norms }: { norms: Row[] }) {
  const t = useScopedI18n("admin.catalog");
  const locale = useCurrentLocale();
  const categories = [...new Set(norms.map((norm) => norm.category))];
  const stateLabel = (norm: Row) => {
    switch (norm.state) {
      case "new":
        return t("states.new");
      case "changed":
        return t("states.changed", { version: norm.version ?? 1 });
      case "unchanged":
        return t("states.unchanged", { version: norm.version ?? 1 });
    }
  };

  return (
    <Panel title={t("norms")}>
      <div className="-mx-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-primary/50">
            <tr>
              <th className="hidden py-2 pl-6 pr-4 sm:table-cell">
                {t("columns.code")}
              </th>
              <th className="py-2 pl-6 pr-4 sm:pl-0">{t("columns.title")}</th>
              <th className="hidden py-2 pr-4 sm:table-cell">
                {t("columns.unit")}
              </th>
              <th className="py-2 pr-6">{t("columns.state")}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <Fragment key={category}>
                <tr className="border-b border-border bg-primary/[0.02]">
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="py-2 pl-6 pr-6 text-xs font-medium text-primary/70"
                  >
                    {category}
                  </th>
                </tr>
                {norms
                  .filter((norm) => norm.category === category)
                  .map((norm) => (
                    <tr
                      key={norm.code}
                      className="border-b border-border last:border-0"
                    >
                      <td className="hidden whitespace-nowrap py-3 pl-6 pr-4 font-mono text-xs text-primary/70 sm:table-cell">
                        {norm.code}
                      </td>
                      <td className="py-3 pl-6 pr-4 sm:pl-0">
                        <span className="block font-mono text-xs text-primary/60 sm:hidden">
                          {norm.code} · {formatUnit(norm.unit, locale)}
                        </span>
                        {norm.normId ? (
                          <Link
                            href={`/catalog/${norm.normId}`}
                            className="text-primary hover:underline"
                          >
                            {norm.title}
                          </Link>
                        ) : (
                          <span className="text-primary">{norm.title}</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap py-3 pr-4 text-primary/70 sm:table-cell">
                        {formatUnit(norm.unit, locale)}
                      </td>
                      <td className="py-3 pr-6">
                        <Pill tone={stateTone[norm.state]}>
                          {stateLabel(norm)}
                        </Pill>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
