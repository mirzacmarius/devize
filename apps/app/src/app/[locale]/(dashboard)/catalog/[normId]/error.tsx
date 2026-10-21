"use client";

import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import Link from "next/link";
import { useScopedI18n } from "@/locales/client";

/**
 * A norm that does not exist, or another firm's own norm: the backend
 * reports both as not found, and so does this page.
 */
export default function NormError() {
  const t = useScopedI18n("norm");
  return (
    <EmptyState
      icon={<Icons.Catalog />}
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      action={
        <Button variant="outline" asChild>
          <Link href="/catalog">{t("backToCatalog")}</Link>
        </Button>
      }
    />
  );
}
