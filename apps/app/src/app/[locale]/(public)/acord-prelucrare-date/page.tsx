import { TERMS_VERSION } from "@devize/backend/convex/accounts/terms";
import type { Metadata } from "next";
import { formatCalendarDate } from "@/lib/format";
import { getCurrentLocale, getScopedI18n } from "@/locales/server";
import {
  Fact,
  Facts,
  LegalPage,
  legalLinks,
  Operator,
} from "../_components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("dpa");
  return { title: t("title"), description: t("description") };
}

/**
 * The data processing agreement (GDPR art. 28) between Devize and each firm:
 * what Devize does with the personal data of the firm's clients on the firm's
 * behalf. It is part of the terms of use and is accepted with them (ADR 0051).
 */
export default async function Page() {
  const t = await getScopedI18n("dpa");
  const legal = await getScopedI18n("legal");
  const locale = await getCurrentLocale();
  const links = await legalLinks();
  const vendors = [
    { name: "Convex", role: t("vendors.convex") },
    { name: "Vercel", role: t("vendors.vercel") },
    { name: "Anthropic", role: t("vendors.anthropic") },
    { name: "Resend", role: t("vendors.resend") },
    { name: "Sentry", role: t("vendors.sentry") },
  ];
  return (
    <LegalPage
      document="dpa"
      title={t("title")}
      date={legal("version", {
        date: formatCalendarDate(TERMS_VERSION, locale, "long"),
      })}
      intro={t("intro", { terms: links.terms })}
      draft
      sections={[
        {
          id: "partile",
          title: t("parties.title"),
          body: (
            <>
              <p className="m-0">{t("parties.body")}</p>
              <Operator missing={t("parties.missing")} />
            </>
          ),
        },
        {
          id: "datele",
          title: t("scope.title"),
          body: (
            <>
              <p className="m-0">{t("scope.body")}</p>
              <p className="m-0">
                {t("scope.excluded", { privacy: links.privacy })}
              </p>
            </>
          ),
        },
        {
          id: "instructiunile",
          title: t("instructions.title"),
          body: (
            <>
              <p className="m-0">
                {t("instructions.body", { terms: links.terms })}
              </p>
              <p className="m-0">{t("instructions.purpose")}</p>
              <p className="m-0">{t("instructions.unlawful")}</p>
            </>
          ),
        },
        {
          id: "confidentialitatea",
          title: t("confidentiality.title"),
          body: <p className="m-0">{t("confidentiality.body")}</p>,
        },
        {
          id: "securitatea",
          title: t("security.title"),
          body: <p className="m-0">{t("security.body")}</p>,
        },
        {
          id: "alte-persoane-imputernicite",
          title: t("subprocessors.title"),
          body: (
            <>
              <p className="m-0">{t("subprocessors.authorization")}</p>
              <p className="m-0">{t("subprocessors.changes")}</p>
              <p className="m-0">{t("subprocessors.obligations")}</p>
            </>
          ),
        },
        {
          id: "transferuri",
          title: t("transfers.title"),
          body: <p className="m-0">{t("transfers.body")}</p>,
        },
        {
          id: "cereri",
          title: t("requests.title"),
          body: (
            <>
              <p className="m-0">{t("requests.firm")}</p>
              <p className="m-0">{t("requests.direct")}</p>
            </>
          ),
        },
        {
          id: "incalcari",
          title: t("breaches.title"),
          body: (
            <>
              <p className="m-0">{t("breaches.notice")}</p>
              <p className="m-0">{t("breaches.content")}</p>
            </>
          ),
        },
        {
          id: "ajutor",
          title: t("assistance.title"),
          body: <p className="m-0">{t("assistance.body")}</p>,
        },
        {
          id: "stergerea",
          title: t("deletion.title"),
          body: (
            <>
              <p className="m-0">{t("deletion.export")}</p>
              <p className="m-0">{t("deletion.firm")}</p>
              <p className="m-0">{t("deletion.backups")}</p>
              <p className="m-0">{t("deletion.law")}</p>
            </>
          ),
        },
        {
          id: "audit",
          title: t("audits.title"),
          body: <p className="m-0">{t("audits.body")}</p>,
        },
        {
          id: "firma",
          title: t("firm.title"),
          body: <p className="m-0">{t("firm.body")}</p>,
        },
        {
          id: "durata",
          title: t("term.title"),
          body: (
            <>
              <p className="m-0">{t("term.duration")}</p>
              <p className="m-0">
                {t("term.liability", { terms: links.terms })}
              </p>
              <p className="m-0">
                {t("term.precedence", { terms: links.terms })}
              </p>
            </>
          ),
        },
      ]}
      annexes={[
        {
          id: "anexa-1",
          title: t("details.title"),
          body: (
            <Facts>
              <Fact label={t("details.subjectsLabel")}>
                {t("details.subjects")}
              </Fact>
              <Fact label={t("details.dataLabel")}>{t("details.data")}</Fact>
              <Fact label={t("details.natureLabel")}>
                {t("details.nature")}
              </Fact>
              <Fact label={t("details.purposeLabel")}>
                {t("details.purpose", { terms: links.terms })}
              </Fact>
              <Fact label={t("details.durationLabel")}>
                {t("details.duration")}
              </Fact>
              <Fact label={t("details.frequencyLabel")}>
                {t("details.frequency")}
              </Fact>
            </Facts>
          ),
        },
        {
          id: "anexa-2",
          title: t("measures.title"),
          body: (
            <>
              <p className="m-0">{t("measures.intro")}</p>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                <li>{t("measures.encryption")}</li>
                <li>{t("measures.access")}</li>
                <li>{t("measures.signIn")}</li>
                <li>{t("measures.links")}</li>
                <li>{t("measures.files")}</li>
                <li>{t("measures.app")}</li>
                <li>{t("measures.minimization")}</li>
                <li>{t("measures.limits")}</li>
                <li>{t("measures.staff")}</li>
                <li>{t("measures.testing")}</li>
                <li>{t("measures.incidents")}</li>
              </ul>
            </>
          ),
        },
        {
          id: "anexa-3",
          title: t("vendors.title"),
          body: (
            <>
              <p className="m-0">{t("vendors.intro")}</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left text-body">
                  <thead className="bg-panel text-ink">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t("vendors.name")}
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t("vendors.role")}
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t("vendors.country")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr
                        key={vendor.name}
                        className="border-t border-border align-top"
                      >
                        <th
                          scope="row"
                          className="px-4 py-2 font-medium text-ink"
                        >
                          {vendor.name}
                        </th>
                        <td className="px-4 py-2">{vendor.role}</td>
                        <td className="px-4 py-2">{t("vendors.usa")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="m-0">{t("vendors.anaf")}</p>
            </>
          ),
        },
      ]}
    />
  );
}
