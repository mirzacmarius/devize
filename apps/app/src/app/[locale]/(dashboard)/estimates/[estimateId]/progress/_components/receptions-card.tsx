"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRun } from "@/components/use-run";
import { formatCalendarDate } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ReceptionSheet } from "./reception-sheet";
import type { Reception, ReceptionKind, Receptions, Works } from "./types";
import { useDownloadProgress } from "./use-download-progress";

const decisionTones: Record<
  NonNullable<Reception["decision"]>,
  StatusPillProps["tone"]
> = {
  admitted: "success",
  postponed: "warning",
  rejected: "danger",
};

/**
 * The two Procese-verbale de recepție of the works: at their end and, after
 * the warranty, the final one. Each is filled in, concluded with the
 * committee's decision and printed as the regulation's model.
 */
export function ReceptionsCard({ works }: { works: Works }) {
  const t = useScopedI18n("progress.receptions");
  const receptions = useQuery(api.progress.receptions.forEstimate, {
    estimateId: works._id,
  });
  const [editing, setEditing] = useState<ReceptionKind | null>(null);

  if (receptions === undefined) {
    return null;
  }
  const completionConcluded = receptions.completion?.status === "concluded";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <ul className="m-0 grid list-none gap-3 p-0">
          {(["completion", "final"] as const).map((kind) => (
            <ReceptionRow
              key={kind}
              kind={kind}
              works={works}
              receptions={receptions}
              reception={receptions[kind]}
              onEdit={() => setEditing(kind)}
            />
          ))}
        </ul>
        {receptions.suggested.approvedStatements > 0 &&
          !receptions.suggested.allExecuted &&
          !completionConcluded && (
            <p className="m-0 text-meta text-warning">{t("notAllExecuted")}</p>
          )}
        <p className="m-0 text-meta text-ink-3">{t("hint")}</p>
      </CardContent>
      <ReceptionSheet
        works={works}
        receptions={receptions}
        kind={editing}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}

function ReceptionRow({
  kind,
  works,
  receptions,
  reception,
  onEdit,
}: {
  kind: ReceptionKind;
  works: Works;
  receptions: Receptions;
  reception: Reception | null;
  onEdit: () => void;
}) {
  const t = useScopedI18n("progress.receptions");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const run = useRun();
  const conclude = useMutation(api.progress.receptions.conclude);
  const reopen = useMutation(api.progress.receptions.reopen);
  const remove = useMutation(api.progress.receptions.remove);
  const { downloadReception } = useDownloadProgress(works);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const concluded = reception?.status === "concluded";
  const locked = works.status !== "accepted";
  // The final reception follows the one at the end of the works.
  const blocked =
    kind === "final" && receptions.completion?.status !== "concluded";

  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    await run(action, message);
    setBusy(false);
  };

  const download = async () => {
    if (!reception) {
      return;
    }
    setDownloading(true);
    const completion = receptions.completion;
    await downloadReception(
      reception,
      reception.value ?? receptions.suggested.value,
      kind === "final" && completion
        ? { number: completion.number, date: completion.date }
        : null,
      t(kind),
    );
    setDownloading(false);
  };

  const state = !reception
    ? t("none")
    : concluded && reception.concludedAt !== undefined
      ? t("concluded", { date: formatCalendarDate(reception.date, locale) })
      : t("draft");

  return (
    <li className="grid gap-2 rounded-md border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body text-ink">{t(kind)}</span>
        {reception?.decision && (
          <StatusPill tone={decisionTones[reception.decision]}>
            {t(`decisions.${reception.decision}`)}
          </StatusPill>
        )}
      </div>
      <span className="text-meta text-ink-2">{state}</span>
      <div className="flex flex-wrap items-center gap-2">
        {!reception ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locked || blocked}
            onClick={onEdit}
          >
            {t("fill")}
          </Button>
        ) : (
          <>
            {!concluded && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                {t("edit")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloading}
              aria-label={t("downloadLabel", { name: t(kind) })}
              onClick={download}
            >
              {downloading && (
                <Icons.Loader className="animate-spin" aria-hidden />
              )}
              {t("download")}
            </Button>
            {!concluded && (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  act(
                    () => conclude({ receptionId: reception._id }),
                    t("concludedToast"),
                  )
                }
              >
                {t("conclude")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={tc("actions")}
                >
                  <Icons.More aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                {concluded && (
                  <DropdownMenuItem
                    onSelect={() =>
                      act(
                        () => reopen({ receptionId: reception._id }),
                        t("reopened"),
                      )
                    }
                  >
                    {t("reopen")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onSelect={() => setConfirming(true)}
                >
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      {blocked && !reception && (
        <span className="text-meta text-ink-3">{t("needsCompletion")}</span>
      )}
      {reception && (
        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={t("deleteTitle")}
          description={t("deleteDescription")}
          confirm={t("deleteConfirm")}
          destructive
          busy={busy}
          onConfirm={async () => {
            await act(
              () => remove({ receptionId: reception._id }),
              t("deleted"),
            );
            setConfirming(false);
          }}
        />
      )}
    </li>
  );
}
