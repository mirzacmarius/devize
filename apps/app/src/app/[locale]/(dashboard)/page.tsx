import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { Header } from "@/app/[locale]/(dashboard)/_components/header";
import { getScopedI18n } from "@/locales/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("navigation");
  return { title: t("home") };
}

export default async function Page() {
  const t = await getScopedI18n("dashboard");

  return (
    <>
      <Header title={t("title")} description={t("description")} />
      <div className="flex h-full w-full bg-secondary px-6 py-8 dark:bg-black">
        <div className="z-10 mx-auto flex h-full w-full max-w-screen-xl gap-12">
          <div className="flex w-full flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-24 dark:bg-black">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-card">
              <FileText className="h-8 w-8 stroke-[1.5px] text-primary/60" />
            </div>
            <div className="flex max-w-[460px] flex-col items-center gap-2">
              <p className="text-base font-medium text-primary">
                {t("emptyTitle")}
              </p>
              <p className="text-center text-base font-normal text-primary/60">
                {t("emptyDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
