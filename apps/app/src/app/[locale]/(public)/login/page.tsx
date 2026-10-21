import type { Metadata } from "next";
import { GoogleSignin } from "@/components/google-signin";
import { Wordmark } from "@/components/wordmark";
import { getScopedI18n } from "@/locales/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("login");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getScopedI18n("login");
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <Wordmark className="text-3xl" />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-medium text-primary">{t("title")}</h1>
          <p className="text-sm text-primary/60">{t("description")}</p>
        </div>
        <GoogleSignin label={t("google")} />
      </div>
    </div>
  );
}
