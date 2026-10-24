"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { useMutation } from "convex/react";
import { useScopedI18n } from "@/locales/client";
import { ErrorText, Pill, useFormat, useRun } from "./ui";

/**
 * One erasure of a producer's people (ADR 0043), with the button to record
 * that the emails sent to them left the mailbox too.
 */
export function ErasureRow({
  erasure,
  manufacturerName,
}: {
  erasure: Pick<
    Doc<"outreachErasures">,
    "_id" | "rule" | "erasedAt" | "addresses" | "subjects" | "mailboxClearedAt"
  >;
  manufacturerName?: string;
}) {
  const t = useScopedI18n("admin.erasures");
  const format = useFormat();
  const markMailboxCleared = useMutation(
    api.manufacturers.retention.markMailboxCleared,
  );
  const { run, error, pending } = useRun();

  return (
    <li className="flex flex-col gap-2 py-3 text-sm first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        {manufacturerName && (
          <span className="font-medium text-primary">{manufacturerName}</span>
        )}
        <span className="text-primary/70">{format.date(erasure.erasedAt)}</span>
        <Pill>{t(`rules.${erasure.rule}`)}</Pill>
        <span className="text-primary/60">
          {t("addresses", { count: erasure.addresses })}
        </span>
      </div>
      {erasure.mailboxClearedAt === undefined ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-primary/70">
            {t("mailbox", { subjects: erasure.subjects.join(" · ") })}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => markMailboxCleared({ erasureId: erasure._id }))
            }
          >
            {t("mailboxDone")}
          </Button>
          <ErrorText error={error} />
        </div>
      ) : erasure.subjects.length > 0 ? (
        <p className="text-primary/50">
          {t("mailboxCleared", {
            date: format.date(erasure.mailboxClearedAt),
          })}
        </p>
      ) : null}
    </li>
  );
}
