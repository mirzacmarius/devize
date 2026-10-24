import { api } from "@devize/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { Wordmark } from "@/components/wordmark";
import { type LegalDocument, legalPaths } from "@/lib/legal";
import { getCurrentLocale, getScopedI18n } from "@/locales/server";

const documents: LegalDocument[] = ["terms", "dpa", "privacy"];

export type LegalSection = { id: string; title: string; body: ReactNode };

/**
 * One of Devize's legal documents, which anyone can open: the terms of use,
 * the data processing agreement and the privacy policy. Each starts with its
 * title, date and what it is about, and ends with links to the other two. A
 * draft says so at the top, until a lawyer has read it.
 */
export async function LegalPage({
  document,
  title,
  date,
  intro,
  draft = false,
  sections = [],
  annexes = [],
  children,
}: {
  document: LegalDocument;
  title: string;
  date: string;
  intro: ReactNode;
  draft?: boolean;
  // Numbered in this order and listed under the intro, as a contract's
  // articles are, so a clause can be named by its number.
  sections?: LegalSection[];
  // After the sections, with their own titles: "Anexa 1. …".
  annexes?: LegalSection[];
  children?: ReactNode;
}) {
  const t = await getScopedI18n("legal");
  const locale = await getCurrentLocale();
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6">
          <Wordmark className="text-xl" />
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-title-page text-ink">{title}</h1>
            <p className="m-0 text-meta text-ink-3">{date}</p>
          </div>
          {draft && (
            <p className="m-0 rounded-md bg-warning-soft px-4 py-3 text-body text-ink-2">
              <strong className="font-medium text-warning">
                {t("draftTitle")}.
              </strong>{" "}
              {t("draft")}
            </p>
          )}
          {locale !== "ro" && (
            <p className="m-0 text-meta text-ink-3">{t("translation")}</p>
          )}
          <p className="m-0 text-body-lg text-ink-2">{intro}</p>
          {sections.length > 0 && (
            <nav
              aria-label={t("contents")}
              className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4 text-body text-ink-2"
            >
              <ol className="m-0 list-decimal gap-x-10 pl-6 sm:columns-2">
                {sections.map((section) => (
                  <li key={section.id} className="break-inside-avoid py-0.5">
                    <ContentsLink section={section} />
                  </li>
                ))}
              </ol>
              {annexes.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-1 border-t border-border p-0 pt-3">
                  {annexes.map((annex) => (
                    <li key={annex.id}>
                      <ContentsLink section={annex} />
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          )}
        </header>
        {sections.map((section, index) => (
          <Section
            key={section.id}
            id={section.id}
            title={`${index + 1}. ${section.title}`}
          >
            {section.body}
          </Section>
        ))}
        {annexes.map((annex) => (
          <Section key={annex.id} id={annex.id} title={annex.title}>
            {annex.body}
          </Section>
        ))}
        {children}
        <nav
          aria-label={t("documents")}
          className="flex flex-col gap-3 border-t border-border pt-6"
        >
          <h2 className="m-0 text-label uppercase text-ink-3">
            {t("documents")}
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-body">
            {documents.map((other) => (
              <li key={other}>
                {other === document ? (
                  <span aria-current="page" className="text-ink">
                    {t(other)}
                  </span>
                ) : (
                  <Link
                    href={legalPaths[other]}
                    className="text-ink-2 underline underline-offset-2 hover:text-ink"
                  >
                    {t(other)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}

function ContentsLink({ section }: { section: LegalSection }) {
  return (
    <a
      href={`#${section.id}`}
      className="underline-offset-2 hover:text-ink hover:underline"
    >
      {section.title}
    </a>
  );
}

/**
 * Links to the legal documents, to put in a text: "{dpa} face parte din ei"
 * shows the agreement's name as a link.
 */
export async function legalLinks(
  className = "text-ink underline underline-offset-2",
): Promise<Record<LegalDocument, ReactNode>> {
  const t = await getScopedI18n("legal");
  const link = (document: LegalDocument) => (
    <Link href={legalPaths[document]} className={className}>
      {t(document)}
    </Link>
  );
  return { terms: link("terms"), dpa: link("dpa"), privacy: link("privacy") };
}

export function Section({
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

export function Facts({ children }: { children: ReactNode }) {
  return <dl className="m-0 flex flex-col gap-3">{children}</dl>;
}

/** A line that starts with what it answers: "Ce date: …". */
export function Fact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="inline font-medium text-ink">{label}: </dt>
      <dd className="m-0 inline">{children}</dd>
    </div>
  );
}

/**
 * Who runs Devize, as a super admin wrote it in Admin → Setări: the privacy
 * policy's controller, the terms' provider and the agreement's processor are
 * the same company. It reads Convex, so it waits for the page's request rather
 * than run in a prefetch (ADR 0029).
 */
export function Operator({
  intro,
  missing,
  contact,
}: {
  intro?: string;
  missing: string;
  contact?: string;
}) {
  return (
    <Suspense
      fallback={<div aria-hidden className="h-28 rounded-lg bg-sunken" />}
    >
      <OperatorDetails intro={intro} missing={missing} contact={contact} />
    </Suspense>
  );
}

async function OperatorDetails({
  intro,
  missing,
  contact,
}: {
  intro?: string;
  missing: string;
  contact?: string;
}) {
  await connection();
  const t = await getScopedI18n("privacy.controller");
  const operator = await fetchQuery(api.privacy.controller, {}).catch(
    () => null,
  );
  if (!operator?.name) {
    return <p className="m-0">{missing}</p>;
  }
  return (
    <>
      {intro && <p className="m-0">{intro}</p>}
      <dl className="m-0 grid gap-x-6 gap-y-1 rounded-lg border border-border bg-panel p-4 text-body sm:grid-cols-[auto_minmax(0,1fr)]">
        <Detail label={t("name")}>{operator.name}</Detail>
        {operator.registration && (
          <Detail label={t("registration")}>{operator.registration}</Detail>
        )}
        {operator.address && (
          <Detail label={t("address")}>{operator.address}</Detail>
        )}
        {operator.email && (
          <Detail label={t("email")}>
            <a
              href={`mailto:${operator.email}`}
              className="text-ink underline underline-offset-2"
            >
              {operator.email}
            </a>
          </Detail>
        )}
      </dl>
      {operator.email && contact && <p className="m-0">{contact}</p>}
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
