import { Card } from "@devize/ui/card";
import type { Metadata } from "next";
import { Wordmark } from "@/components/wordmark";
import { env } from "@/env.mjs";
import { getScopedI18n } from "@/locales/server";
import { legalLinks } from "../_components/legal-page";
import { SignInOptions } from "./sign-in-options";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("login");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getScopedI18n("login");
  const links = await legalLinks(
    "underline underline-offset-2 hover:text-ink-2",
  );
  // Google sends people back to one fixed address, so on preview deployments,
  // each with its own address and backend, only the emailed code works.
  const withGoogle = env.VERCEL_ENV !== "preview";
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-shell px-4 py-12">
      <div className="grid w-full max-w-[400px] gap-6">
        <Wordmark className="justify-self-center text-xl" />
        <Card className="grid gap-6 p-6 sm:p-8">
          <div className="grid gap-1.5">
            <h1 className="m-0 text-title-screen text-ink">{t("heading")}</h1>
            <p className="m-0 text-body text-ink-2 [text-wrap:balance]">
              {t("description")}
            </p>
          </div>
          <SignInOptions withGoogle={withGoogle} />
        </Card>
        <p className="m-0 px-4 text-center text-meta text-ink-3">
          {t("legal", { terms: links.terms, privacy: links.privacy })}
        </p>
      </div>
    </div>
  );
}
