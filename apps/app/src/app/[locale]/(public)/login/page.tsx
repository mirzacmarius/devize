import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { env } from "@/env.mjs";
import { getScopedI18n } from "@/locales/server";
import { SignInOptions } from "./sign-in-options";

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
        <SignInOptions withGoogle={withGoogle} />
        <Link
          href="/confidentialitate"
          className="text-meta text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline"
        >
          {t("privacy")}
        </Link>
      </div>
    </div>
  );
}
