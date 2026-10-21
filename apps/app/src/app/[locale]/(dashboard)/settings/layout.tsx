import { PageHeader } from "@devize/ui/page-header";
import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { SettingsTabs } from "./_components/settings-tabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("settings");
  return { title: t("title") };
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getScopedI18n("settings");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <SettingsTabs />
      <div className="grid max-w-3xl gap-4">{children}</div>
    </>
  );
}
