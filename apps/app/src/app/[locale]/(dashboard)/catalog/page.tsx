import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("catalog");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getScopedI18n("catalog");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState
        icon={<Icons.Catalog />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    </>
  );
}
