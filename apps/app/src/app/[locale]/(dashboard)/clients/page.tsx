import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { ClientList } from "./_components/client-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("clients");
  return { title: t("title") };
}

export default function Page() {
  return <ClientList />;
}
