import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { PricesPage } from "./_components/prices-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("prices");
  return { title: t("title") };
}

export default function Page() {
  return <PricesPage />;
}
