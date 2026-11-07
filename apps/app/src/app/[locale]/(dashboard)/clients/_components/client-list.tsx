"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { cn } from "@devize/ui/utils";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { ListToolbar } from "@/components/list-toolbar";
import { Nil } from "@/components/nil";
import { SearchInput } from "@/components/search-input";
import { formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ClientSheet } from "./client-sheet";

export function ClientList() {
  const t = useScopedI18n("clients");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const clients = useQuery(api.accounts.clients.list, {
    organizationId: firm._id,
    text: search || undefined,
  });
  const activity = useQuery(api.accounts.clients.activity, {
    organizationId: firm._id,
  });
  const activityOf = new Map(activity?.map((row) => [row.clientId, row]) ?? []);
  const owed = (id: Doc<"clients">["_id"]) => activityOf.get(id)?.owed ?? 0;
  // Who owes the most first; everyone else stays in the order of their names.
  const rows =
    clients && activity
      ? [...clients].sort((a, b) => owed(b._id) - owed(a._id))
      : undefined;
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<Doc<"clients"> | null>(null);

  const edit = (value: Doc<"clients"> | null) => {
    setClient(value);
    setOpen(true);
  };

  const isEmpty = clients !== undefined && clients.length === 0 && !search;
  return (
    <>
      <PageHeader
        title={t("title")}
        description={
          // Keeps its line while loading, so nothing jumps.
          clients === undefined || isEmpty
            ? "\u00a0"
            : `${t("count", { count: clients.length })} · ${tc("inLeiLower")}`
        }
        actions={
          <>
            {!isEmpty && (
              <SearchInput
                quiet
                tall
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="w-48 max-sm:hidden md:w-64 xl:w-80"
              />
            )}
            <Button onClick={() => edit(null)}>
              <Plus aria-hidden />
              {t("new")}
            </Button>
          </>
        }
      />
      {isEmpty ? (
        <EmptyState
          icon={<Icons.Clients />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" onClick={() => edit(null)}>
              {t("emptyAction")}
            </Button>
          }
        />
      ) : (
        <section className="grid min-w-0 gap-3">
          {/* From a tablet up it stands in the page's head. */}
          <ListToolbar className="sm:hidden">
            <SearchInput
              quiet
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full"
            />
          </ListToolbar>
          <Table stack twoLine>
            <TableHeader>
              <TableRow>
                <TableHead className="xl:w-[34%]">
                  {t("columns.name")}
                </TableHead>
                <TableHead className="xl:w-[36%]">
                  {t("columns.contact")}
                </TableHead>
                <TableHead className="hidden w-20 text-right md:table-cell xl:w-[12%]">
                  {t("columns.estimates")}
                </TableHead>
                <TableHead className="hidden w-32 text-right md:table-cell xl:w-[18%]">
                  {t("columns.owed")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === undefined && (
                <TableRow>
                  <TableCell colSpan={4} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {rows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-ink-3">
                    {t("noResults", { text: search })}
                  </TableCell>
                </TableRow>
              )}
              {rows?.map((row) => {
                const going = activityOf.get(row._id);
                return (
                  <TableRow key={row._id}>
                    <TableCell data-stack="wide">
                      <div className="grid gap-0.5">
                        <button
                          type="button"
                          onClick={() => edit(row)}
                          className="justify-self-start rounded-xs text-left text-body font-medium text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {row.name}
                        </button>
                        <span className="text-meta tabular-nums text-ink-3">
                          {t(`kinds.${row.kind}`)}
                          {row.cui && ` · ${row.cui}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      data-stack="wide"
                      className="max-md:empty:hidden"
                    >
                      {(row.email || row.phone) && (
                        <div className="grid justify-items-start gap-0.5">
                          {row.email && (
                            <a
                              href={`mailto:${row.email}`}
                              className="max-w-full truncate text-meta text-ink-3 hover:underline"
                            >
                              {row.email}
                            </a>
                          )}
                          {row.phone && (
                            <a
                              href={`tel:${row.phone}`}
                              className="whitespace-nowrap text-meta tabular-nums text-ink-3 hover:underline"
                            >
                              {row.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {going?.estimates ? going.estimates : <Nil />}
                    </TableCell>
                    <TableCell
                      data-stack="wide"
                      className={cn(
                        "whitespace-nowrap text-right tabular-nums",
                        !going?.owed && "max-md:hidden",
                      )}
                    >
                      {/* On a phone its head is gone, so it says what it is. */}
                      <span className="flex items-baseline justify-between gap-3 md:block">
                        <span className="text-meta text-ink-3 md:hidden">
                          {t("columns.owed")}
                        </span>
                        {going?.owed ? (
                          <span className="font-medium">
                            {formatMoney(going.owed, locale)}
                          </span>
                        ) : (
                          <Nil />
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}
      <ClientSheet client={client} open={open} onOpenChange={setOpen} />
    </>
  );
}
