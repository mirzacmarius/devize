import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { EstimatePage } from "./_components/estimate-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("estimates");
  return { title: t("title") };
}

export default function Page() {
  return <EstimatePage />;
}
