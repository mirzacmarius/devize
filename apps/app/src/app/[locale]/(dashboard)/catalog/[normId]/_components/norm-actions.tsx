"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

type Confirm = "publish" | "archive" | "delete";

/**
 * The header's actions, which follow the norm's life: edit and publish a
 * draft, open a new version of a published norm, archive it. A norm the firm
 * can't edit is copied into its own norms, and a producer confirms its own.
 */
export function NormActions({ norm }: { norm: Norm }) {
  const t = useScopedI18n("norm");
  const tc = useScopedI18n("common");
  const router = useRouter();
  const run = useRun();
  const { firm } = useFirm();
  const publish = useMutation(api.catalog.norms.publish);
  const submit = useMutation(api.catalog.norms.submit);
  const createVersion = useMutation(api.catalog.norms.createVersion);
  const copyToOrganization = useMutation(api.catalog.norms.copyToOrganization);
  const confirmNorm = useMutation(api.catalog.norms.confirm);
  const archive = useMutation(api.catalog.norms.archive);
  const removeDraft = useMutation(api.catalog.norms.removeDraft);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const normId = norm._id;
  const { code, status, canEdit } = norm;
  const isDraft = status === "draft" || status === "review";
  const own = norm.source === "organization";

  const act = async <T,>(action: () => Promise<T>, success?: string) => {
    setBusy(true);
    const result = await run(action, success);
    setBusy(false);
    return result;
  };

  // A copy and a new version both open in the editor, to be adjusted.
  const copy = async () => {
    const result = await act(
      () => copyToOrganization({ normId, organizationId: firm._id }),
      t("actions.copied"),
    );
    if (result.ok) {
      router.push(`/catalog/${result.value}/edit`);
    }
  };

  const newVersion = async () => {
    const result = await act(() => createVersion({ normId }));
    if (result.ok) {
      router.push(`/catalog/${result.value}/edit`);
    }
  };

  const deleteDraft = async () => {
    const result = await act(
      () => removeDraft({ normId }),
      t("actions.deleted"),
    );
    if (result.ok) {
      setConfirm(null);
      router.push(
        norm.latestVersionId
          ? `/catalog/${norm.latestVersionId}`
          : "/catalog?view=own",
      );
    }
  };

  let secondary: ReactNode = null;
  let primary: ReactNode = null;
  if (canEdit && isDraft) {
    secondary = (
      <Button variant="outline" asChild>
        <Link href={`/catalog/${normId}/edit`}>{t("actions.edit")}</Link>
      </Button>
    );
    if (norm.canPublish) {
      primary = (
        <Button onClick={() => setConfirm("publish")} disabled={busy}>
          {t("actions.publish")}
        </Button>
      );
    } else if (status === "draft") {
      primary = (
        <Button
          disabled={busy}
          onClick={() => act(() => submit({ normId }), t("actions.submitted"))}
        >
          {t("actions.submit")}
        </Button>
      );
    }
  } else if (canEdit && status === "published") {
    primary = (
      <Button onClick={newVersion} disabled={busy}>
        {t("actions.newVersion")}
      </Button>
    );
  } else if (!canEdit && status === "published") {
    primary = (
      <Button onClick={copy} disabled={busy}>
        {t("actions.copy")}
      </Button>
    );
  }
  if (norm.canConfirm) {
    secondary = (
      <Button
        variant="outline"
        disabled={busy}
        onClick={() =>
          act(() => confirmNorm({ normId }), t("actions.confirmed"))
        }
      >
        <Icons.Verified aria-hidden />
        {t("actions.confirm")}
      </Button>
    );
  }
  // Copying is always possible; the menu offers it when the header doesn't,
  // and has nothing else to offer a norm the firm can't edit.
  const hasMenu = canEdit || status !== "published";

  return (
    <>
      {secondary}
      {primary}
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={tc("actions")}>
              <Icons.More aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem onSelect={copy}>
              {own ? t("actions.duplicate") : t("actions.copy")}
            </DropdownMenuItem>
            {canEdit && status === "published" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setConfirm("archive")}>
                  {t("actions.archive")}
                </DropdownMenuItem>
              </>
            )}
            {canEdit && isDraft && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onSelect={() => setConfirm("delete")}
                >
                  {t("actions.deleteDraft")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmDialog
        open={confirm === "publish"}
        onClose={() => setConfirm(null)}
        title={t("publishDialog.title", { code })}
        description={
          norm.latestVersionId
            ? t("publishDialog.replaces", { version: norm.version })
            : t("publishDialog.description")
        }
        confirm={t("publishDialog.confirm")}
        busy={busy}
        onConfirm={async () => {
          const result = await act(
            () => publish({ normId }),
            t("actions.published", { code }),
          );
          if (result.ok) {
            setConfirm(null);
          }
        }}
      />
      <ConfirmDialog
        open={confirm === "archive"}
        onClose={() => setConfirm(null)}
        title={t("archiveDialog.title", { code })}
        description={t("archiveDialog.description")}
        confirm={t("archiveDialog.confirm")}
        busy={busy}
        onConfirm={async () => {
          const result = await act(
            () => archive({ normId }),
            t("actions.archived"),
          );
          if (result.ok) {
            setConfirm(null);
          }
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title={t("deleteDialog.title", { code })}
        description={t("deleteDialog.description")}
        confirm={t("deleteDialog.confirm")}
        destructive
        busy={busy}
        onConfirm={deleteDraft}
      />
    </>
  );
}
