import type { Metadata } from "next";
import { Actions, CtaBand } from "@/components/cta";
import { FormsStrip } from "@/components/forms-strip";
import { PageHero } from "@/components/page-hero";
import { Roadmap } from "@/components/roadmap";
import { Section, SectionHeader } from "@/components/section";
import { workflow } from "@/content/constructori";
import { appLinks } from "@/lib/links";

const title = "Pentru constructori: devize cu prețuri la zi";
const description =
  "Cum face un constructor devizul în Devize: din descriere, poze sau lista licitației, cu norme de producător, prețuri din magazine, verificări, ofertă pe link și formularele oficiale.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/constructori" },
  openGraph: { title, description, url: "/constructori" },
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Pentru constructori"
        title="Devizul tău, de la prima poză la semnătura clientului."
        lead="Devize face devizul așa cum îl faci tu, doar că fără copy-paste și fără listele de prețuri de anul trecut: norme scrise acum, prețuri citite azi din magazin, verificări înainte de trimitere și o ofertă pe care clientul o semnează pe telefon."
      >
        <Actions
          secondary={{ href: appLinks.enter, label: "Intră în aplicație" }}
        />
      </PageHero>

      {workflow.map((section, index) => (
        <Section key={section.id} id={section.id} sunken={index % 2 === 1}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              <SectionHeader
                eyebrow={section.eyebrow}
                title={section.title}
                lead={section.lead}
              />
              {section.id === "licitatii" && <FormsStrip />}
            </div>
            <dl className="m-0 grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {section.points.map((point) => (
                <div
                  key={point.title}
                  className="flex flex-col gap-2 border-t border-border pt-4"
                >
                  <dt className="text-title-card text-ink">{point.title}</dt>
                  <dd className="m-0 text-pretty text-body text-ink-2">
                    {point.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>
      ))}

      <Section>
        <SectionHeader
          eyebrow="În lucru"
          title="Ce urmează pentru constructori"
          lead="Site-ul spune doar ce există în aplicație. Acestea sunt lucrările în curs."
        />
        <div className="mt-10">
          <Roadmap />
        </div>
      </Section>

      <CtaBand
        title="Primul deviz, azi."
        lead="Fără card bancar, fără instalare. Intri cu e-mailul sau cu contul Google și descrii lucrarea."
        secondary={{
          href: "/preturi",
          label: "Vezi prețurile",
          internal: true,
        }}
      />
    </>
  );
}
