import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { TakeoffPage } from "./_components/takeoff-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("takeoff");
  return { title: t("title") };
}

export default function Page() {
  return <TakeoffPage />;
}
