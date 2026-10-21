import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { SettingsNav } from "./_components/settings-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("settings");
  return { title: t("title") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full px-6 py-8">
      <div className="mx-auto flex h-full w-full max-w-screen-xl gap-12">
        <SettingsNav />
        {children}
      </div>
    </div>
  );
}
