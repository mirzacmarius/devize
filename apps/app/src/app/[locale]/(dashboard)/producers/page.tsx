import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { ProducersPage } from "./_components/producers-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("producers");
  return { title: t("title") };
}

export default function Page() {
  return <ProducersPage />;
}
