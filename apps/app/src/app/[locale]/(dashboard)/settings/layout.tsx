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
      <PageHeader title={t("title")} />
      <div className="grid min-w-0 gap-6">
        <SettingsTabs />
        <div className="settings-sections grid min-w-0 max-w-[640px] gap-6 xl:max-w-[928px]">
          {children}
        </div>
      </div>
    </>
  );
}
