import { api } from "@devize/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { Wordmark } from "@/components/wordmark";
import { getScopedI18n } from "@/locales/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("privacy");
  return { title: t("title"), description: t("description") };
}

/**
 * Devize's privacy policy, which anyone can open: the emails to producers
 * and the website's footer link to it. The text ships with the app; who
 * answers for the data is what a super admin wrote in Admin → Setări.
 */
export default async function Page() {
  const t = await getScopedI18n("privacy");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6">
          <Wordmark className="text-xl" />
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-title-page text-ink">{t("title")}</h1>
            <p className="m-0 text-meta text-ink-3">{t("updated")}</p>
          </div>
          <p className="m-0 text-body-lg text-ink-2">{t("intro")}</p>
        </header>

        <Section id="operator" title={t("controller.title")}>
          <Suspense
            fallback={<div aria-hidden className="h-28 rounded-lg bg-sunken" />}
          >
            <Controller />
          </Suspense>
        </Section>

        <Section id="producatori" title={t("producers.title")}>
          <p className="m-0">{t("producers.intro")}</p>
          <Facts>
            <Fact label={t("labels.data")}>{t("producers.data")}</Fact>
            <Fact label={t("labels.source")}>{t("producers.source")}</Fact>
            <Fact label={t("labels.purpose")}>{t("producers.purpose")}</Fact>
            <Fact label={t("labels.basis")}>{t("producers.basis")}</Fact>
            <Fact label={t("labels.optOut")}>{t("producers.optOut")}</Fact>
            <Fact label={t("labels.retention")}>
              {t("producers.retention")}
            </Fact>
          </Facts>
          <p className="m-0">{t("producers.claims")}</p>
        </Section>

        <Section id="utilizatori" title={t("users.title")}>
          <Facts>
            <Fact label={t("labels.data")}>{t("users.data")}</Fact>
            <Fact label={t("labels.purpose")}>{t("users.purpose")}</Fact>
            <Fact label={t("labels.basis")}>{t("users.basis")}</Fact>
            <Fact label={t("labels.retention")}>{t("users.retention")}</Fact>
          </Facts>
        </Section>

        <Section id="clienti" title={t("clients.title")}>
          <p className="m-0">{t("clients.body")}</p>
          <p className="m-0">{t("clients.others")}</p>
        </Section>

        <Section id="vizitatori" title={t("visitors.title")}>
          <Facts>
            <Fact label={t("labels.data")}>{t("visitors.data")}</Fact>
            <Fact label={t("labels.purpose")}>{t("visitors.purpose")}</Fact>
            <Fact label={t("labels.basis")}>{t("visitors.basis")}</Fact>
            <Fact label={t("labels.retention")}>{t("visitors.retention")}</Fact>
          </Facts>
        </Section>

        <Section id="ai" title={t("ai.title")}>
          <p className="m-0">{t("ai.body")}</p>
          <p className="m-0">{t("ai.dictation")}</p>
        </Section>

        <Section id="furnizori" title={t("processors.title")}>
          <p className="m-0">{t("processors.intro")}</p>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
            <li>{t("processors.convex")}</li>
            <li>{t("processors.vercel")}</li>
            <li>{t("processors.anthropic")}</li>
            <li>{t("processors.resend")}</li>
            <li>{t("processors.google")}</li>
            <li>{t("processors.sentry")}</li>
          </ul>
          <p className="m-0">{t("processors.outreach")}</p>
          <p className="m-0">{t("processors.transfers")}</p>
          <p className="m-0">{t("processors.anaf")}</p>
          <p className="m-0">{t("processors.authorities")}</p>
        </Section>

        <Section id="cookie-uri" title={t("cookies.title")}>
          <p className="m-0">{t("cookies.body")}</p>
        </Section>

        <Section id="drepturi" title={t("rights.title")}>
          <p className="m-0">{t("rights.body")}</p>
          <p className="m-0">{t("rights.contact")}</p>
          <p className="m-0">{t("rights.complaint")}</p>
        </Section>

        <Section id="siguranta" title={t("security.title")}>
          <p className="m-0">{t("security.body")}</p>
        </Section>

        <Section id="schimbari" title={t("changes.title")}>
          <p className="m-0">{t("changes.body")}</p>
        </Section>
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-8 flex-col gap-3 text-body-lg text-ink-2"
    >
      <h2 id={`${id}-title`} className="m-0 text-title-card text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Facts({ children }: { children: ReactNode }) {
  return <dl className="m-0 flex flex-col gap-3">{children}</dl>;
}

/** A line that starts with what it answers: "Ce date: …". */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="inline font-medium text-ink">{label}: </dt>
      <dd className="m-0 inline">{children}</dd>
    </div>
  );
}

/**
 * Who answers for the data, as Admin → Setări has it now. It reads Convex, so
 * it waits for the page's request rather than run in a prefetch (ADR 0029).
 */
async function Controller() {
  await connection();
  const t = await getScopedI18n("privacy.controller");
  const controller = await fetchQuery(api.privacy.controller, {}).catch(
    () => null,
  );
  if (!controller?.name) {
    return <p className="m-0">{t("missing")}</p>;
  }
  return (
    <>
      <p className="m-0">{t("intro")}</p>
      <dl className="m-0 grid gap-x-6 gap-y-1 rounded-lg border border-border bg-panel p-4 text-body sm:grid-cols-[auto_minmax(0,1fr)]">
        <Detail label={t("name")}>{controller.name}</Detail>
        {controller.registration && (
          <Detail label={t("registration")}>{controller.registration}</Detail>
        )}
        {controller.address && (
          <Detail label={t("address")}>{controller.address}</Detail>
        )}
        {controller.email && (
          <Detail label={t("email")}>
            <a
              href={`mailto:${controller.email}`}
              className="text-ink underline underline-offset-2"
            >
              {controller.email}
            </a>
          </Detail>
        )}
      </dl>
      {controller.email && <p className="m-0">{t("contact")}</p>}
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-3">{label}</dt>
      <dd className="m-0 mb-2 text-ink sm:mb-0">{children}</dd>
    </>
  );
}
