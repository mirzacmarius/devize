import type { Metadata } from "next";
import { Actions, CtaBand } from "@/components/cta";
import { FaqList, faqJsonLd } from "@/components/faq-list";
import { FeatureGrid } from "@/components/feature-grid";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { Section, SectionHeader } from "@/components/section";
import { Steps } from "@/components/steps";
import {
  producerFaq,
  producerFeatures,
  reasons,
  statSample,
  steps,
} from "@/content/producatori";
import { appLinks } from "@/lib/links";

const title =
  "Pentru producători: publică normele de deviz ale produselor tale";
const description =
  "Producătorii de materiale publică gratuit în Devize norme de deviz din fișele tehnice ale produselor lor, verificate înainte de publicare, și văd lunar cum sunt folosite în devize.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/producatori" },
  openGraph: { title, description, url: "/producatori" },
};

export default function Page() {
  return (
    <>
      <JsonLd data={faqJsonLd(producerFaq)} />

      <PageHero
        eyebrow="Pentru producători"
        title="Normele tale, în devizele constructorilor."
        lead="Publici gratuit normele de deviz pentru produsele tale, direct din fișele tehnice. Când un constructor caută lucrarea, norma ta apare prima, cu produsele tale și consumurile corecte, și ajunge în devizul trimis clientului și în lista de cumpărături."
      >
        <Actions
          primary={{ href: appLinks.producers, label: "Revendică profilul" }}
          secondary={{
            href: "/preturi#producatori",
            label: "Ce costă",
            internal: true,
          }}
        />
      </PageHero>

      <Section>
        <SectionHeader
          eyebrow="De ce"
          title="Norma publicată de producător bate orice indicator"
        />
        <ul className="m-0 mt-10 grid gap-4 p-0 md:grid-cols-3">
          {reasons.map((reason) => (
            <li
              key={reason.title}
              className="flex list-none flex-col gap-3 rounded-lg border border-card-border bg-card p-5 shadow-card"
            >
              <h3 className="m-0 text-title-card text-ink">{reason.title}</h3>
              <p className="m-0 text-pretty text-body text-ink-2">
                {reason.description}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section sunken>
        <SectionHeader
          eyebrow="Cum merge"
          title="De la fișa tehnică la catalog, în patru pași"
          lead="Firma ta scrie norma cu ajutorul Devize AI, echipa Devize o verifică, iar publicarea se face doar cu acordul tău scris."
        />
        <div className="mt-12">
          <Steps steps={steps} />
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Ce primești"
          title="Profil, norme, sisteme și statistici"
        />
        <div className="mt-10">
          <FeatureGrid features={producerFeatures} columns={3} />
        </div>
      </Section>

      <Section sunken>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <SectionHeader
            eyebrow="Statistici de utilizare"
            title="Cum ajung produsele tale în devize, lună de lună"
            lead="Numărăm devize și cantități, nu firme. Un județ apare doar când cel puțin trei firme din el ți-au folosit normele. Cifrele de alături sunt un exemplu."
          />
          <dl
            className="m-0 grid grid-cols-2 gap-4 rounded-lg border border-card-border bg-card p-6 shadow-card"
            aria-label="Exemplu de statistici"
          >
            {statSample.map((stat) => (
              <div key={stat.label} className="flex min-w-0 flex-col gap-1">
                <dt className="text-label uppercase text-ink-3">
                  {stat.label}
                </dt>
                <dd className="m-0 text-[26px] font-light leading-8 tracking-[-0.01em] text-ink tabular-nums md:text-kpi">
                  {stat.value}
                </dd>
                <dd className="m-0 text-meta text-ink-3">{stat.meta}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <SectionHeader eyebrow="Întrebări" title="Ce întreabă producătorii" />
          <FaqList items={producerFaq} />
        </div>
      </Section>

      <CtaBand
        title="Pune-ți normele acolo unde se fac devizele."
        lead="Revendici profilul în câteva minute. Publicarea e gratuită și rămâne așa."
        primary={{ href: appLinks.producers, label: "Revendică profilul" }}
        secondary={{
          href: "/intrebari-frecvente",
          label: "Întrebări frecvente",
          internal: true,
        }}
      />
    </>
  );
}
