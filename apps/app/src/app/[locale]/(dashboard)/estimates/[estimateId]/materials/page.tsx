import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { MaterialsPage } from "./_components/materials-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("materials");
  return { title: t("title") };
}

export default function Page() {
  return <MaterialsPage />;
}
