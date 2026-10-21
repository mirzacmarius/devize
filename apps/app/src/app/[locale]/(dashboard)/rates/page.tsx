import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { RatesPage } from "./_components/rates-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("rates");
  return { title: t("title") };
}

export default function Page() {
  return <RatesPage />;
}
