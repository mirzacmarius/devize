import type { Metadata } from "next";
import { EmailSignIn } from "@/components/email-sign-in";
import { GoogleSignin } from "@/components/google-signin";
import { Wordmark } from "@/components/wordmark";
import { env } from "@/env.mjs";
import { getScopedI18n } from "@/locales/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("login");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getScopedI18n("login");
  // Google sends people back to one fixed address, so on preview deployments,
  // each with its own address and backend, only the emailed code works.
  const withGoogle = env.VERCEL_ENV !== "preview";
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <Wordmark className="text-3xl" />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-title-card text-ink">{t("title")}</h1>
          <p className="m-0 text-body text-ink-2">{t("description")}</p>
        </div>
        <div className="grid w-full gap-4">
          <EmailSignIn />
          {withGoogle && (
            <>
              <div className="flex items-center gap-3 text-meta text-ink-3">
                <span aria-hidden className="h-px flex-1 bg-border" />
                {t("or")}
                <span aria-hidden className="h-px flex-1 bg-border" />
              </div>
              <GoogleSignin label={t("google")} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
