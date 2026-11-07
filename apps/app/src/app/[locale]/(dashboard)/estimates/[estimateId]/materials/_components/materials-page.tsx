"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { useQuery } from "convex/react";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouteParam } from "@/components/use-route-param";
import { estimateCode } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { LayoutCard } from "./layout-card";
import { PackageDialog } from "./package-dialog";
import { ShoppingListCard } from "./shopping-list-card";
import { SummaryCard } from "./summary-card";
import type { ListRow } from "./types";

/**
 * Ambalaje și pierderi: a Deviz's Lista de cumpărături in whole bags, boxes
 * and rolls, with what is left over, and the Mod de montaj of the Articole
 * that lay a covering, whose losses change what there is to buy.
 */
export function MaterialsPage() {
  const estimateId = useRouteParam("estimateId") as Id<"estimates">;
  const t = useScopedI18n("materials");
  const tEstimate = useScopedI18n("estimate");
  const tBasket = useScopedI18n("prices.basket");
  const tc = useScopedI18n("common");
  const list = useQuery(api.materials.list.forEstimate, { estimateId });
  const [editing, setEditing] = useState<ListRow | null>(null);

  if (list === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const { estimate } = list;
  const code = estimateCode(estimate.number, estimate.revision);

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={tEstimate("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/estimates">{tEstimate("breadcrumbList")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbLink asChild className="min-w-0">
              <Link href={`/estimates/${estimate._id}`}>
                <span className="truncate">
                  {code} · {estimate.title}
                </span>
              </Link>
            </BreadcrumbLink>
          </Breadcrumb>
        }
        title={t("title")}
        actions={
          list.rows.length > 0 && (
            <Button variant="outline" asChild>
              <Link href={`/estimates/${estimate._id}/basket`}>
                <ShoppingCart aria-hidden />
                {tBasket("open")}
              </Link>
            </Button>
          )
        }
      />
      {list.rows.length === 0 ? (
        <EmptyState
          icon={<Icons.Resources />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="grid min-w-0 gap-6">
          <SummaryCard list={list} />
          <ShoppingListCard list={list} onEdit={setEditing} />
          {list.layouts.length > 0 && (
            <LayoutCard layouts={list.layouts} locked={estimate.locked} />
          )}
        </div>
      )}
      <PackageDialog
        organizationId={estimate.organizationId}
        row={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
