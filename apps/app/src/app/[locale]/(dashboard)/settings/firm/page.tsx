import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { FirmSettings } from "./_components/firm-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("settings");
  return { title: t("tabs.firm") };
}

export default function Page() {
  return <FirmSettings />;
}
