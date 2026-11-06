"use client";

import { useScopedI18n } from "@/locales/client";
import {
  jobTone,
  Panel,
  Pill,
  useErrorText,
  useFormat,
} from "../../../_components/ui";
import type { Job } from "./types";

export function JobsPanel({ jobs }: { jobs: Job[] }) {
  const t = useScopedI18n("admin.manufacturer.jobs");
  const tAdmin = useScopedI18n("admin");
  const format = useFormat();
  const errorText = useErrorText();

  return (
    <Panel title={t("title")}>
      {jobs.length === 0 ? (
        <p className="text-body text-ink-3">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border text-body">
          {jobs.map((job) => (
            <li
              key={job._id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 first:pt-0"
            >
              <span className="w-28 font-medium text-ink-2">
                {tAdmin(`jobKind.${job.kind}`)}
              </span>
              <Pill tone={jobTone[job.status]}>
                {tAdmin(`status.job.${job.status}`)}
              </Pill>
              <span className="text-ink-3">
                {t("started")}: {format.date(job._creationTime)}
              </span>
              {job.costUsd !== undefined && (
                <span className="text-ink-3">
                  {t("cost")}: {format.usd(job.costUsd)} USD
                </span>
              )}
              {job.model && <span className="text-ink-3">{job.model}</span>}
              {job.error && (
                <span className="w-full text-meta text-danger">
                  {errorText(job.error)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
