import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { CatalogPage } from "./_components/catalog-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("catalog");
  return { title: t("title") };
}

export default function Page() {
  return <CatalogPage />;
}
