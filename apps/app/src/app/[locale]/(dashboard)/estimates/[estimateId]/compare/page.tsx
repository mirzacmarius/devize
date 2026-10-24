import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { ComparePage } from "./_components/compare-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("compare");
  return { title: t("title") };
}

export default function Page() {
  return <ComparePage />;
}
