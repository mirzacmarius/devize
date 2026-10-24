"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { type StartFrom, starterChoice, type TemplateList } from "./start-from";
import { TemplateDialog, type TemplateFields } from "./template-dialog";

type Template = TemplateList["templates"][number];

/**
 * The firm's Șabloane and Devize's starters, each one a click away from a new
 * Deviz; the firm's can be renamed and deleted here.
 */
export function TemplatesSheet({
  open,
  onOpenChange,
  onUse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (choice: StartFrom) => void;
}) {
  const t = useScopedI18n("templates.sheet");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        closeLabel={tc("close")}
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        {open && <TemplatesPanel onUse={onUse} />}
      </SheetContent>
    </Sheet>
  );
}

function TemplatesPanel({ onUse }: { onUse: (choice: StartFrom) => void }) {
  const t = useScopedI18n("templates");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const data = useQuery(api.templates.templates.list, {
    organizationId: firm._id,
  });
  const rename = useMutation(api.templates.templates.rename);
  const remove = useMutation(api.templates.templates.remove);
  const run = useRun();
  const [renaming, setRenaming] = useState<Template>();
  const [deleting, setDeleting] = useState<Template>();
  const [busy, setBusy] = useState(false);

  if (data === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const saveName = async (fields: TemplateFields) => {
    if (!renaming) {
      return;
    }
    setBusy(true);
    const result = await run(
      () => rename({ templateId: renaming._id, ...fields }),
      t("sheet.renamed"),
    );
    setBusy(false);
    if (result.ok) {
      setRenaming(undefined);
    }
  };

  const deleteTemplate = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    const result = await run(
      () => remove({ templateId: deleting._id }),
      t("sheet.deleted"),
    );
    setBusy(false);
    if (result.ok) {
      setDeleting(undefined);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-2" aria-labelledby="templates-firm">
        <h3 id="templates-firm" className="m-0 text-label uppercase text-ink-3">
          {t("sheet.firm")}
        </h3>
        {data.templates.length === 0 ? (
          <p className="m-0 rounded-md border border-border bg-sunken px-3 py-2 text-meta text-ink-2">
            {t("sheet.empty")}
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {data.templates.map((template) => (
              <li
                key={template._id}
                className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <div className="grid min-w-0 gap-0.5">
                  <span className="text-body font-medium text-ink">
                    {template.name}
                  </span>
                  {template.description && (
                    <span className="text-meta text-ink-2">
                      {template.description}
                    </span>
                  )}
                  <span className="text-meta text-ink-3 tabular-nums">
                    {t("sheet.meta", {
                      items: template.itemCount,
                      total: formatMoney(template.total, locale),
                    })}
                    {" · "}
                    {template.usedCount > 0
                      ? t("sheet.used", { count: template.usedCount })
                      : t("sheet.neverUsed")}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={t("sheet.useLabel", { name: template.name })}
                    onClick={() =>
                      onUse({ kind: "template", templateId: template._id })
                    }
                  >
                    {t("sheet.use")}
                  </Button>
                  {template.canChange && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={t("sheet.actionsLabel", {
                            name: template.name,
                          })}
                        >
                          <Icons.More aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => setRenaming(template)}
                        >
                          {t("sheet.rename")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-danger focus:text-danger"
                          onSelect={() => setDeleting(template)}
                        >
                          {t("sheet.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-2" aria-labelledby="templates-starters">
        <h3
          id="templates-starters"
          className="m-0 text-label uppercase text-ink-3"
        >
          {t("sheet.starters")}
        </h3>
        <ul className="m-0 grid list-none gap-2 p-0">
          {data.starters.map((starter) => {
            const name = t(`starters.${starter.key}.name`);
            return (
              <li
                key={starter.key}
                className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <div className="grid min-w-0 gap-0.5">
                  <span className="text-body font-medium text-ink">{name}</span>
                  <span className="text-meta text-ink-2">
                    {t(`starters.${starter.key}.description`)}
                  </span>
                  {!starter.available && (
                    <span className="text-meta text-ink-3">
                      {t("sheet.unavailable")}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={!starter.available}
                  aria-label={t("sheet.useLabel", { name })}
                  onClick={() => onUse(starterChoice(starter.key, locale))}
                >
                  {t("sheet.use")}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <TemplateDialog
        open={renaming !== undefined}
        onOpenChange={(next) => !next && setRenaming(undefined)}
        title={t("rename.title")}
        submit={t("rename.submit")}
        initial={{
          name: renaming?.name ?? "",
          description: renaming?.description,
        }}
        busy={busy}
        onSubmit={saveName}
      />
      <ConfirmDialog
        open={deleting !== undefined}
        onClose={() => setDeleting(undefined)}
        title={t("sheet.deleteTitle", { name: deleting?.name ?? "" })}
        description={t("sheet.deleteDescription")}
        confirm={t("sheet.deleteConfirm")}
        destructive
        busy={busy}
        onConfirm={deleteTemplate}
      />
    </div>
  );
}
