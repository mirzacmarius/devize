"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";

/** The confirmed statement's Factură: a link to it, or the button that starts it. */
export function StatementInvoice({
  statementId,
}: {
  statementId: Id<"workStatements">;
}) {
  const t = useScopedI18n("invoices.fromStatement");
  const run = useRun();
  const router = useRouter();
  const invoice = useQuery(api.invoices.invoices.forStatement, {
    workStatementId: statementId,
  });
  const fromStatement = useMutation(api.invoices.statements.fromStatement);
  const [busy, setBusy] = useState(false);
  if (invoice === undefined) {
    return null;
  }
  if (invoice) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/invoices/${invoice._id}`}>
          <Icons.Invoice aria-hidden />
          {invoice.code ? t("open", { code: invoice.code }) : t("draft")}
        </Link>
      </Button>
    );
  }
  const create = async () => {
    setBusy(true);
    const result = await run(
      () => fromStatement({ workStatementId: statementId }),
      t("created"),
    );
    setBusy(false);
    if (result.ok) {
      router.push(`/invoices/${result.value}`);
    }
  };
  return (
    <Button type="button" size="sm" disabled={busy} onClick={create}>
      {busy ? (
        <Icons.Loader className="animate-spin" aria-hidden />
      ) : (
        <Icons.Invoice aria-hidden />
      )}
      {t("issue")}
    </Button>
  );
}
