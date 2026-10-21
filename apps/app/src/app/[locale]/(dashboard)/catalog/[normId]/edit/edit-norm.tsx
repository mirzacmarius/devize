"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useScopedI18n } from "@/locales/client";
import { NormForm } from "../../_components/norm-form";

/** The editor for a draft; a published norm changes only through a new version. */
export function EditNorm({ normId }: { normId: Id<"norms"> }) {
  const t = useScopedI18n("norm");
  const norm = useQuery(api.catalog.norms.get, { normId });
  if (norm === undefined) {
    return <p className="m-0 text-body text-ink-3">{t("loading")}</p>;
  }
  if (!norm.canEdit || (norm.status !== "draft" && norm.status !== "review")) {
    return (
      <EmptyState
        icon={<Icons.Catalog />}
        title={norm.code}
        description={t("form.locked")}
        action={
          <Button variant="outline" asChild>
            <Link href={`/catalog/${norm._id}`}>{t("backToNorm")}</Link>
          </Button>
        }
      />
    );
  }
  // Keyed by the norm, so the form starts again from another draft's fields.
  return <NormForm key={norm._id} norm={norm} />;
}
