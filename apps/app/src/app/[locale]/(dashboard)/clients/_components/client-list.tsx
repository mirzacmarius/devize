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
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<Doc<"clients"> | null>(null);

  const edit = (value: Doc<"clients"> | null) => {
    setClient(value);
    setOpen(true);
  };

  const isEmpty = clients !== undefined && clients.length === 0 && !search;
  const searchInput = (className: string) => (
    <SearchInput
      value={text}
      onChange={(event) => setText(event.target.value)}
      placeholder={t("searchPlaceholder")}
      aria-label={t("searchPlaceholder")}
      className={className}
    />
  );

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
            {!isEmpty && searchInput("w-72 max-sm:hidden")}
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
          {searchInput("w-full sm:hidden")}
          <Table stack twoLine>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.contact")}</TableHead>
                <TableHead className="hidden xl:table-cell">
                  {t("columns.address")}
                </TableHead>
                <TableHead className="hidden w-20 text-right md:table-cell">
                  {t("columns.estimates")}
                </TableHead>
                <TableHead className="hidden w-32 text-right md:table-cell">
                  {t("columns.owed")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients === undefined && (
                <TableRow>
                  <TableCell colSpan={5} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {clients?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-ink-3">
                    {t("noResults", { text: search })}
                  </TableCell>
                </TableRow>
              )}
              {clients?.map((row) => {
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
                              className="max-w-full truncate text-body text-ink-2 hover:underline"
                            >
                              {row.email}
                            </a>
                          )}
                          {row.phone && (
                            <a
                              href={`tel:${row.phone}`}
                              className={cn(
                                "whitespace-nowrap tabular-nums hover:underline",
                                row.email
                                  ? "text-meta text-ink-3"
                                  : "text-body text-ink-2",
                              )}
                            >
                              {row.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-ink-2 xl:table-cell">
                      <span className="line-clamp-2">{row.address}</span>
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
                          formatMoney(going.owed, locale)
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
