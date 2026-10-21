"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { Badge } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import { Card, CardContent, CardHeader, TickRule } from "@devize/ui/card";
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
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { SearchInput } from "@/components/search-input";
import { useScopedI18n } from "@/locales/client";
import { ClientSheet } from "./client-sheet";

export function ClientList() {
  const t = useScopedI18n("clients");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const clients = useQuery(api.accounts.clients.list, {
    organizationId: firm._id,
    text: search || undefined,
  });
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
        description={t("description")}
        actions={
          <Button onClick={() => edit(null)}>
            <Plus aria-hidden />
            {t("new")}
          </Button>
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
        <Card>
          <CardHeader>
            <SearchInput
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full max-w-sm"
            />
          </CardHeader>
          <TickRule />
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.contact")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("columns.address")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients === undefined && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-ink-3">
                      {tc("loading")}
                    </TableCell>
                  </TableRow>
                )}
                {clients?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-ink-3">
                      {t("noResults", { text: search })}
                    </TableCell>
                  </TableRow>
                )}
                {clients?.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <button
                          type="button"
                          onClick={() => edit(row)}
                          className="justify-self-start rounded-xs text-left text-body font-medium text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {row.name}
                        </button>
                        <span className="flex flex-wrap items-center gap-2 text-meta text-ink-3">
                          <Badge>{t(`kinds.${row.kind}`)}</Badge>
                          {row.cui && (
                            <span className="font-mono text-code">
                              {row.cui}
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-0.5 text-body">
                        {row.phone && (
                          <a
                            href={`tel:${row.phone}`}
                            className="text-ink hover:underline"
                          >
                            {row.phone}
                          </a>
                        )}
                        {row.email && (
                          <a
                            href={`mailto:${row.email}`}
                            className="truncate text-ink-2 hover:underline"
                          >
                            {row.email}
                          </a>
                        )}
                        {!row.phone && !row.email && (
                          <span className="text-ink-3">{tc("notSet")}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-ink-2 md:table-cell">
                      {row.address ?? (
                        <span className="text-ink-3">{tc("notSet")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <ClientSheet client={client} open={open} onOpenChange={setOpen} />
    </>
  );
}
