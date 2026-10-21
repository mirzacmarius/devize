import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { EstimateList } from "./_components/estimate-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("estimates");
  return { title: t("title") };
}

export default function Page() {
  return <EstimateList />;
}
