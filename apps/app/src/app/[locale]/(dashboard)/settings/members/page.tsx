import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { MembersSettings } from "./_components/members-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("settings");
  return { title: t("tabs.members") };
}

export default function Page() {
  return <MembersSettings />;
}
