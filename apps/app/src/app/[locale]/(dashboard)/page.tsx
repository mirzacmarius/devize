import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { HomePage } from "./_components/home-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("home");
  return { title: t("title") };
}

export default function Page() {
  return <HomePage />;
}
