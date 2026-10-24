import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { ProgressPage } from "./_components/progress-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("progress");
  return { title: t("title") };
}

export default function Page() {
  return <ProgressPage />;
}
