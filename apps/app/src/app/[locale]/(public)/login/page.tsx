import { Card } from "@devize/ui/card";
import type { Metadata } from "next";
import { Amount } from "@/components/amount";
import { Wordmark } from "@/components/wordmark";
import { env } from "@/env.mjs";
import { formatMoney } from "@/lib/format";
import { getCurrentLocale, getScopedI18n } from "@/locales/server";
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
    <div className="grid min-h-screen w-full bg-shell xl:grid-cols-[minmax(0,1fr)_minmax(0,620px)]">
      <aside className="hidden min-w-0 flex-col gap-10 px-12 py-10 xl:flex">
        <Wordmark className="self-start text-xl" />
        <div className="my-auto grid max-w-[480px] gap-8">
          <p className="m-0 text-display text-ink [text-wrap:balance]">
            {t("brand.headline")}
          </p>
          <hr aria-hidden className="tick-rule m-0 border-0" />
          <SampleEstimate />
        </div>
      </aside>
      <main className="flex min-w-0 flex-col items-center justify-center bg-panel px-4 py-12 xl:m-2 xl:ml-0 xl:rounded-2xl xl:shadow-panel">
        <div className="grid w-full max-w-[400px] gap-6">
          <Wordmark className="text-xl xl:hidden" />
          <div className="grid gap-1.5">
            <h1 className="m-0 text-title-screen text-ink">{t("heading")}</h1>
            <p className="m-0 text-body text-ink-2">{t("description")}</p>
          </div>
          <SignInOptions withGoogle={withGoogle} />
          <p className="m-0 text-meta text-ink-3">
            {t("legal", { terms: links.terms, privacy: links.privacy })}
          </p>
        </div>
      </main>
    </div>
  );
}

/** What the product makes, shown with the app's own card: the numbers lead. */
async function SampleEstimate() {
  const t = await getScopedI18n("login.sample");
  const locale = await getCurrentLocale();
  const rows = [
    { label: t("materials"), value: 21480.3 },
    { label: t("labour"), value: 9204.26 },
    { label: t("equipment"), value: 2304 },
  ];
  return (
    <Card aria-hidden className="grid gap-5 p-6">
      <div className="grid gap-0.5">
        <span className="text-title-card text-ink">{t("title")}</span>
        <span className="text-meta text-ink-3">{t("meta")}</span>
      </div>
      <div className="grid">
        <span className="text-meta text-ink-2">{t("total")}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-kpi tabular-nums text-ink">
            <Amount value={formatMoney(39916.16, locale)} />
          </span>
          <span className="text-meta text-ink-3">lei</span>
        </span>
      </div>
      <dl className="m-0 grid text-body">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-4 border-t border-border py-2"
          >
            <dt className="text-ink-2">{row.label}</dt>
            <dd className="m-0 tabular-nums text-ink">
              {formatMoney(row.value, locale)}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t-[3px] border-double border-tick pt-2 font-medium text-ink">
          <dt>{t("subtotal")}</dt>
          <dd className="m-0 tabular-nums">{formatMoney(32988.56, locale)}</dd>
        </div>
      </dl>
    </Card>
  );
}
