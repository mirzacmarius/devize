import { TERMS_VERSION } from "@devize/backend/convex/accounts/terms";
import type { Metadata } from "next";
import { formatCalendarDate } from "@/lib/format";
import { getCurrentLocale, getScopedI18n } from "@/locales/server";
import { LegalPage, legalLinks, Operator } from "../_components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("terms");
  return { title: t("title"), description: t("description") };
}

/**
 * Devize's terms of use, which a firm accepts when it is created and again
 * for each new version (ADR 0051). The sign-in page, the firm step and the
 * website's footer link to it.
 */
export default async function Page() {
  const t = await getScopedI18n("terms");
  const legal = await getScopedI18n("legal");
  const locale = await getCurrentLocale();
  const links = await legalLinks();
  return (
    <LegalPage
      document="terms"
      title={t("title")}
      date={legal("version", {
        date: formatCalendarDate(TERMS_VERSION, locale, "long"),
      })}
      intro={t("intro", { dpa: links.dpa, privacy: links.privacy })}
      draft
      sections={[
        {
          id: "furnizor",
          title: t("provider.title"),
          body: (
            <Operator
              intro={t("provider.intro")}
              missing={t("provider.missing")}
              contact={t("provider.contact")}
            />
          ),
        },
        {
          id: "acceptare",
          title: t("acceptance.title"),
          body: (
            <>
              <p className="m-0">{t("acceptance.who")}</p>
              <p className="m-0">{t("acceptance.professionals")}</p>
              <p className="m-0">{t("acceptance.clients")}</p>
              <p className="m-0">{t("acceptance.contract")}</p>
            </>
          ),
        },
        {
          id: "serviciul",
          title: t("service.title"),
          body: (
            <>
              <p className="m-0">{t("service.body")}</p>
              <p className="m-0">{t("service.changes")}</p>
            </>
          ),
        },
        {
          id: "contul",
          title: t("account.title"),
          body: (
            <>
              <p className="m-0">{t("account.access")}</p>
              <p className="m-0">{t("account.roles")}</p>
              <p className="m-0">{t("account.details")}</p>
            </>
          ),
        },
        {
          id: "datele-firmei",
          title: t("content.title"),
          body: (
            <>
              <p className="m-0">
                {t("content.ownership", { dpa: links.dpa })}
              </p>
              <p className="m-0">{t("content.statistics")}</p>
              <p className="m-0">{t("content.rights")}</p>
            </>
          ),
        },
        {
          id: "norme-si-preturi",
          title: t("estimates.title"),
          body: (
            <>
              <p className="m-0">{t("estimates.norms")}</p>
              <p className="m-0">{t("estimates.prices")}</p>
              <p className="m-0">{t("estimates.checks")}</p>
              <p className="m-0">{t("estimates.forms")}</p>
            </>
          ),
        },
        {
          id: "devize-ai",
          title: t("ai.title"),
          body: (
            <>
              <p className="m-0">{t("ai.features")}</p>
              <p className="m-0">{t("ai.proposals")}</p>
              <p className="m-0">{t("ai.limits")}</p>
            </>
          ),
        },
        {
          id: "oferte",
          title: t("offers.title"),
          body: (
            <>
              <p className="m-0">{t("offers.contract")}</p>
              <p className="m-0">{t("offers.consumers")}</p>
              <p className="m-0">{t("offers.signature")}</p>
            </>
          ),
        },
        {
          id: "facturi",
          title: t("invoices.title"),
          body: (
            <>
              <p className="m-0">{t("invoices.responsibility")}</p>
              <p className="m-0">{t("invoices.archive")}</p>
              <p className="m-0">{t("invoices.deletion")}</p>
            </>
          ),
        },
        {
          id: "producatori",
          title: t("producers.title"),
          body: (
            <>
              <p className="m-0">{t("producers.accuracy")}</p>
              <p className="m-0">{t("producers.license")}</p>
            </>
          ),
        },
        {
          id: "reguli",
          title: t("use.title"),
          body: (
            <>
              <p className="m-0">{t("use.intro")}</p>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                <li>{t("use.illegal")}</li>
                <li>{t("use.content")}</li>
                <li>{t("use.access")}</li>
                <li>{t("use.scraping")}</li>
                <li>{t("use.spam")}</li>
                <li>{t("use.abuse")}</li>
              </ul>
              <p className="m-0">{t("use.outro")}</p>
            </>
          ),
        },
        {
          id: "semnalari",
          title: t("reports.title"),
          body: (
            <>
              <p className="m-0">{t("reports.body")}</p>
              <p className="m-0">{t("reports.contact")}</p>
            </>
          ),
        },
        {
          id: "pretul",
          title: t("price.title"),
          body: <p className="m-0">{t("price.body")}</p>,
        },
        {
          id: "disponibilitatea",
          title: t("availability.title"),
          body: (
            <>
              <p className="m-0">{t("availability.body")}</p>
              <p className="m-0">{t("availability.copies")}</p>
            </>
          ),
        },
        {
          id: "raspunderea",
          title: t("liability.title"),
          body: (
            <>
              <p className="m-0">{t("liability.indirect")}</p>
              <p className="m-0">{t("liability.cap")}</p>
              <p className="m-0">
                {t("liability.exceptions", { dpa: links.dpa })}
              </p>
              <p className="m-0">{t("liability.firm")}</p>
            </>
          ),
        },
        {
          id: "incetarea",
          title: t("termination.title"),
          body: (
            <>
              <p className="m-0">{t("termination.firm", { dpa: links.dpa })}</p>
              <p className="m-0">{t("termination.suspension")}</p>
              <p className="m-0">{t("termination.ending")}</p>
              <p className="m-0">{t("termination.survival")}</p>
            </>
          ),
        },
        {
          id: "proprietatea",
          title: t("property.title"),
          body: (
            <>
              <p className="m-0">{t("property.body")}</p>
              <p className="m-0">{t("property.feedback")}</p>
            </>
          ),
        },
        {
          id: "confidentialitate",
          title: t("privacy.title"),
          body: (
            <>
              <p className="m-0">{t("privacy.confidential")}</p>
              <p className="m-0">
                {t("privacy.personal", {
                  privacy: links.privacy,
                  dpa: links.dpa,
                })}
              </p>
            </>
          ),
        },
        {
          id: "schimbari",
          title: t("changes.title"),
          body: (
            <>
              <p className="m-0">{t("changes.notice")}</p>
              <p className="m-0">{t("changes.acceptance")}</p>
            </>
          ),
        },
        {
          id: "legea",
          title: t("law.title"),
          body: <p className="m-0">{t("law.body")}</p>,
        },
        {
          id: "clauze-exprese",
          title: t("express.title"),
          body: <p className="m-0">{t("express.body")}</p>,
        },
      ]}
    />
  );
}
