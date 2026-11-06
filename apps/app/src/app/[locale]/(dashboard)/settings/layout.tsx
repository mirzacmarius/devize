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
      <div className="grid max-w-5xl gap-6 xl:grid-cols-[168px_minmax(0,1fr)] xl:gap-10">
        <SettingsTabs />
        <div className="grid min-w-0 max-w-3xl gap-6">{children}</div>
      </div>
    </>
  );
}
