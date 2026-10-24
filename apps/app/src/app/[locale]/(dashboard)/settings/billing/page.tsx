import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { BillingSettings } from "./_components/billing-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("settings");
  return { title: t("tabs.billing") };
}

export default function Page() {
  return <BillingSettings />;
}
