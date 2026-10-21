"use client";

import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import Link from "next/link";
import { useScopedI18n } from "@/locales/client";

/**
 * A Deviz that does not exist, or belongs to another firm: the backend
 * reports both as not found, and so does this page.
 */
export default function EstimateError() {
  const t = useScopedI18n("estimate");
  return (
    <EmptyState
      icon={<Icons.Deviz />}
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      action={
        <Button variant="outline" asChild>
          <Link href="/estimates">{t("backToList")}</Link>
        </Button>
      }
    />
  );
}
