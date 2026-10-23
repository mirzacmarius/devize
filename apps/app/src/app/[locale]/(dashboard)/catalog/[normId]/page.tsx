import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { NormPage } from "./_components/norm-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("catalog");
  return { title: t("title") };
}

export default function Page() {
  return <NormPage />;
}
