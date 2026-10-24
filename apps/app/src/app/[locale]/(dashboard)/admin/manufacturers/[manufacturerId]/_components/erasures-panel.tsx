"use client";

import { useScopedI18n } from "@/locales/client";
import { ErasureRow } from "../../../_components/erasure-row";
import { Panel } from "../../../_components/ui";
import type { Erasure } from "./types";

/**
 * What the daily run erased from the producer's people (ADR 0043), and
 * whether the emails sent to them left the mailbox too.
 */
export function ErasuresPanel({ erasures }: { erasures: Erasure[] }) {
  const t = useScopedI18n("admin.erasures");
  if (erasures.length === 0) {
    return null;
  }
  return (
    <Panel title={t("title")} description={t("description")}>
      <ul className="flex flex-col divide-y divide-border">
        {erasures.map((erasure) => (
          <ErasureRow key={erasure._id} erasure={erasure} />
        ))}
      </ul>
    </Panel>
  );
}
