import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import {
  Fact,
  Facts,
  LegalPage,
  legalLinks,
  Operator,
  Section,
} from "../_components/legal-page";

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
  const links = await legalLinks();
  return (
    <LegalPage
      document="privacy"
      title={t("title")}
      date={t("updated")}
      intro={t("intro")}
    >
      <Section id="operator" title={t("controller.title")}>
        <Operator
          intro={t("controller.intro")}
          missing={t("controller.missing")}
          contact={t("controller.contact")}
        />
      </Section>

      <Section id="producatori" title={t("producers.title")}>
        <p className="m-0">{t("producers.intro")}</p>
        <Facts>
          <Fact label={t("labels.data")}>{t("producers.data")}</Fact>
          <Fact label={t("labels.source")}>{t("producers.source")}</Fact>
          <Fact label={t("labels.purpose")}>{t("producers.purpose")}</Fact>
          <Fact label={t("labels.basis")}>{t("producers.basis")}</Fact>
          <Fact label={t("labels.optOut")}>{t("producers.optOut")}</Fact>
          <Fact label={t("labels.retention")}>{t("producers.retention")}</Fact>
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
        <p className="m-0">
          {t("clients.dpa", { dpa: links.dpa, terms: links.terms })}
        </p>
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
          <li>{t("processors.cloudflare")}</li>
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
    </LegalPage>
  );
}
