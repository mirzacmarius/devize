"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { WorkContext } from "@devize/backend/convex/systems/contexts";
import { Badge } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRouteParam } from "@/components/use-route-param";
import { useRun } from "@/components/use-run";
import { formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ProducerHeader } from "./producer-header";
import { SystemSheet } from "./system-sheet";

export type ProducerSystems = NonNullable<
  FunctionReturnType<typeof api.systems.producerSystems.forManufacturer>
>;
export type ProducerSystem = ProducerSystems["systems"][number];

const tones: Record<ProducerSystem["status"], StatusPillProps["tone"]> = {
  draft: "neutral",
  published: "success",
  archived: "neutral",
};

/**
 * A Producător's systems: its norms and products that are installed
 * together, and where they suit. Firms read them here; its own firm and
 * Devize staff write and publish them. Published, they complete and check
 * the devize that use part of them.
 */
export function SystemsPage() {
  const manufacturerId = useRouteParam("manufacturerId") as Id<"manufacturers">;
  const t = useScopedI18n("compatibility.producerSystems");
  const tProducers = useScopedI18n("producers");
  const tc = useScopedI18n("common");
  const profile = useQuery(api.producers.profiles.get, { manufacturerId });
  const data = useQuery(api.systems.producerSystems.forManufacturer, {
    manufacturerId,
  });
  const remove = useMutation(api.systems.producerSystems.remove);
  const run = useRun();
  // The system being written: a new one, or one to change.
  const [editing, setEditing] = useState<{
    system: ProducerSystem | null;
  } | null>(null);
  const [removing, setRemoving] = useState<ProducerSystem | null>(null);
  const [busy, setBusy] = useState(false);

  if (profile === undefined || data === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }
  if (profile === null || data === null) {
    return (
      <EmptyState
        icon={<Icons.Producers />}
        title={tProducers("profile.notFound")}
        action={
          <Button variant="outline" asChild>
            <Link href="/producers">{tProducers("profile.back")}</Link>
          </Button>
        }
      />
    );
  }

  const { canEdit, choices } = data;
  const newButton = canEdit && (
    <Button onClick={() => setEditing({ system: null })}>
      <Plus aria-hidden />
      {t("new")}
    </Button>
  );

  const confirmRemove = async () => {
    if (!removing) {
      return;
    }
    setBusy(true);
    const result = await run(
      () => remove({ systemId: removing._id }),
      t("deleted"),
    );
    setBusy(false);
    if (result.ok) {
      setRemoving(null);
    }
  };

  return (
    <>
      <ProducerHeader profile={profile} tab="systems" actions={newButton} />
      <p className="m-0 max-w-3xl text-body text-ink-2">{t("description")}</p>
      {data.systems.length === 0 ? (
        <EmptyState
          icon={<Icons.Catalog />}
          title={t("emptyTitle")}
          description={canEdit ? t("emptyEditor") : t("emptyDescription")}
          action={newButton || undefined}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {data.systems.map((system) => (
            <SystemCard
              key={system._id}
              system={system}
              canEdit={canEdit}
              onEdit={() => setEditing({ system })}
              onRemove={() => setRemoving(system)}
            />
          ))}
        </div>
      )}
      <p className="m-0 text-meta text-ink-3">{t("neutral")}</p>

      {canEdit && choices && (
        <SystemSheet
          manufacturerId={manufacturerId}
          choices={choices}
          editing={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("deleteTitle", { name: removing?.name ?? "" })}
        description={t("deleteDescription")}
        confirm={t("delete")}
        destructive
        busy={busy}
        onConfirm={confirmRemove}
      />
    </>
  );
}

function SystemCard({
  system,
  canEdit,
  onEdit,
  onRemove,
}: {
  system: ProducerSystem;
  canEdit: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useScopedI18n("compatibility.producerSystems");
  const tContexts = useScopedI18n("compatibility.contexts");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const setStatus = useMutation(api.systems.producerSystems.setStatus);
  const run = useRun();
  const [busy, setBusy] = useState(false);

  const changeStatus = async (
    status: ProducerSystem["status"],
    success: string,
  ) => {
    setBusy(true);
    await run(() => setStatus({ systemId: system._id, status }), success);
    setBusy(false);
  };

  const contexts = (
    label: string,
    values: readonly WorkContext[],
    tone: "success" | "danger",
  ) =>
    values.length > 0 && (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-meta text-ink-3">{label}</span>
        {values.map((context) => (
          <Badge key={context} tone={tone}>
            {tContexts(context)}
          </Badge>
        ))}
      </div>
    );

  return (
    <Card>
      <CardHeader className="items-start">
        <div className="grid min-w-0 gap-1">
          <CardTitle>{system.name}</CardTitle>
          {system.description && (
            <CardDescription className="m-0 whitespace-pre-line">
              {system.description}
            </CardDescription>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <StatusPill tone={tones[system.status]}>
              {t(`statuses.${system.status}`)}
            </StatusPill>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={tc("actions")}
                  disabled={busy}
                >
                  <Icons.More aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onSelect={onEdit}>
                  {t("edit")}
                </DropdownMenuItem>
                {system.status === "published" ? (
                  <DropdownMenuItem
                    onSelect={() => changeStatus("draft", t("drafted"))}
                  >
                    {t("unpublish")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => changeStatus("published", t("published"))}
                  >
                    {t("publish")}
                  </DropdownMenuItem>
                )}
                {system.status !== "archived" && (
                  <DropdownMenuItem
                    onSelect={() => changeStatus("archived", t("archived"))}
                  >
                    {t("archive")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onSelect={onRemove}
                >
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-3">
        {system.norms.length > 0 && (
          <div className="grid gap-1.5">
            <span className="text-label uppercase text-ink-3">
              {t("norms")}
            </span>
            <ul className="m-0 grid list-none gap-1 p-0">
              {system.norms.map((norm) => (
                <li key={norm.lineageId} className="flex min-w-0 gap-2">
                  <Link
                    href={`/catalog/${norm.normId}`}
                    className="shrink-0 font-mono text-code text-ink hover:underline"
                  >
                    {norm.code}
                  </Link>
                  <span className="min-w-0 text-body text-ink-2">
                    {norm.title}
                    <span className="text-ink-3">
                      {" "}
                      · {formatUnit(norm.unit, locale)}
                    </span>
                    {!norm.published && (
                      <span className="text-warning">
                        {" "}
                        · {t("unpublished")}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {system.products.length > 0 && (
          <div className="grid gap-1.5">
            <span className="text-label uppercase text-ink-3">
              {t("products")}
            </span>
            <ul className="m-0 grid list-none gap-1 p-0">
              {system.products.map((product) => (
                <li key={product.productId} className="text-body text-ink-2">
                  {product.name}
                  {!product.published && (
                    <span className="text-warning"> · {t("unpublished")}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {contexts(t("suitable"), system.suitable, "success")}
        {contexts(t("unsuitable"), system.unsuitable, "danger")}
      </CardContent>
    </Card>
  );
}
