import { buttonVariants } from "@devize/ui/button";
import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Actions, CtaBand } from "@/components/cta";
import { DevizPreview } from "@/components/deviz-preview";
import { FaqList } from "@/components/faq-list";
import { FeatureCard, FeatureGrid } from "@/components/feature-grid";
import { FormsStrip } from "@/components/forms-strip";
import { JsonLd } from "@/components/json-ld";
import { Roadmap } from "@/components/roadmap";
import {
  Container,
  Eyebrow,
  Lead,
  Section,
  SectionHeader,
} from "@/components/section";
import { Steps } from "@/components/steps";
import { faqGroups } from "@/content/faq";
import { features, pillars, steps } from "@/content/features";
import { plans } from "@/content/pricing";
import { siteDescription, siteName } from "@/content/site";
import { appLinks, appUrl } from "@/lib/links";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const lei = new Intl.NumberFormat("ro-RO");

const audiences = [
  {
    href: "/constructori",
    eyebrow: "Constructori",
    title: "De la prima poză la semnătura clientului",
    points: [
      "Deviz din descriere, poze, dictare sau lista licitației",
      "Prețuri din magazine, verificări și detector de omisiuni",
      "Ofertă pe link, formulare oficiale, lista de cumpărături",
    ],
  },
  {
    href: "/producatori",
    eyebrow: "Producători",
    title: "Normele tale, în devizele constructorilor",
    points: [
      "Publici gratuit norme din fișele tehnice ale produselor",
      "Norma ta apare prima când se potrivește lucrării",
      "Statistici lunare despre cum sunt folosite, fără firme nominale",
    ],
  },
] as const;

const tenderPoints = [
  "Importi lista de cantități din Excel, PDF sau poze; Devize AI potrivește fiecare poziție pe o normă.",
  "Descarci toate formularele într-un singur PDF sau într-un Excel cu o foaie pe formular.",
  "Verificarea de dinaintea descărcării prinde pozițiile sărite, dublurile și cantitățile schimbate.",
  "Prețurile se scriu chiar în fișierul Excel al autorității, în așezarea ei.",
];

const faqTeaser = faqGroups
  .flatMap((group) => group.items)
  .filter((item) =>
    [
      "De unde vin normele?",
      "De unde vin prețurile materialelor?",
      "Ce face Devize AI și ce nu face?",
      "Este Devize gratuit?",
    ].includes(item.question),
  );

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      url: siteUrl,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteName,
      inLanguage: "ro",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: siteName,
      url: appUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: siteDescription,
      inLanguage: "ro",
      offers: { "@type": "Offer", price: "0", priceCurrency: "RON" },
    },
  ],
};

export default function Page() {
  return (
    <>
      <JsonLd data={structuredData} />

      <section className="overflow-hidden">
        <Container className="flex flex-col gap-8 pt-16 md:pt-24">
          <div className="flex max-w-3xl flex-col gap-6">
            <Eyebrow>Devize de construcții, cu AI</Eyebrow>
            <h1 className="m-0 text-balance text-[40px] font-light leading-[44px] tracking-[-0.02em] text-ink md:text-display">
              Devizul corect, cu prețurile de azi.
            </h1>
            <Lead className="md:text-[18px] md:leading-[28px]">
              Norme publicate chiar de producători, prețuri citite din magazine
              cu data lor și formularele oficiale pentru licitații. Devize AI
              propune articolele și omisiunile; tu decizi ce intră în deviz.
            </Lead>
            <Actions
              secondary={{
                href: "#cum-functioneaza",
                label: "Vezi cum funcționează",
              }}
            />
            <p className="m-0 text-meta text-ink-3">
              Fără card bancar. Intri cu e-mailul sau cu contul Google.
            </p>
          </div>
        </Container>
        <Container className="pb-16 pt-12 md:pb-24">
          <div className="rounded-xl border border-border bg-sunken p-1.5 md:p-2">
            <DevizPreview />
          </div>
        </Container>
      </section>

      <Section sunken>
        <SectionHeader
          eyebrow="De ce Devize"
          title="Trei lucruri pe care programele vechi de devize nu le au"
        />
        <ul className="m-0 mt-10 grid gap-4 p-0 md:grid-cols-3">
          {pillars.map((pillar) => (
            <FeatureCard key={pillar.title} feature={pillar} />
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Pentru cine"
          title="Constructorii fac devizele. Producătorii le dau normele."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {audiences.map((audience) => (
            <Link
              key={audience.href}
              href={audience.href}
              className="group flex flex-col gap-5 rounded-lg border border-card-border bg-card p-6 shadow-card transition-colors hover:bg-tile"
            >
              <Eyebrow>{audience.eyebrow}</Eyebrow>
              <h3 className="m-0 text-balance text-[24px] font-light leading-[30px] tracking-[-0.01em] text-ink">
                {audience.title}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {audience.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-body text-ink-2"
                  >
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-ink-3"
                    />
                    {point}
                  </li>
                ))}
              </ul>
              <span className="mt-auto inline-flex items-center gap-1 text-body font-medium text-ink">
                Vezi pagina
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="cum-functioneaza" sunken>
        <SectionHeader
          eyebrow="Cum funcționează"
          title="Patru pași de la lucrare la ofertă"
          lead="Fiecare pas e făcut de tine, cu propunerile Devize AI alături. Nimic nu intră în deviz fără confirmarea ta."
        />
        <div className="mt-12">
          <Steps steps={steps} />
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Ce intră în deviz"
          title="Tot ce are nevoie un deviz ca să fie și corect, și acceptat"
        />
        <div className="mt-10">
          <FeatureGrid features={features} />
        </div>
      </Section>

      <Section sunken>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <SectionHeader
            eyebrow="Licitații publice"
            title="Formularele oficiale, din același deviz"
            lead="Pentru ofertele depuse în SEAP, Devize completează formularele cerute de HG 907/2016 și de Ordinul 1014/2001 direct din deviz, le verifică și le descarcă gata de semnat."
          />
          <div className="flex flex-col gap-6">
            <FormsStrip />
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {tenderPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-body text-ink-2"
                >
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-ink-3"
                  />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/constructori#licitatii"
              className="inline-flex items-center gap-1 text-body font-medium text-ink hover:underline"
            >
              Cum merge o licitație în Devize
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Prețuri"
          title="Un preț pe firmă, oricâți colegi"
          lead="Planurile propuse pentru lansare. Până atunci, aplicația nu are nicio limită și nu se plătește nimic."
        />
        <ul className="m-0 mt-10 grid gap-4 p-0 md:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex list-none flex-col gap-3 rounded-lg border border-card-border bg-card p-5 shadow-card"
            >
              <h3 className="m-0 text-title-card text-ink">{plan.name}</h3>
              <p className="m-0 flex items-baseline gap-2">
                <span className="text-[32px] font-light leading-none tracking-[-0.01em] text-ink tabular-nums">
                  {lei.format(plan.price)} lei
                </span>
                <span className="text-meta text-ink-3">pe lună</span>
              </p>
              <p className="m-0 text-body text-ink-2">{plan.tagline}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Link
            href="/preturi"
            className={buttonVariants({ variant: "outline" })}
          >
            Vezi toate planurile
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </Section>

      <Section sunken>
        <SectionHeader
          eyebrow="În lucru"
          title="Ce construim acum"
          lead="Site-ul spune doar ce există în aplicație. Acestea sunt lucrările în curs, în ordinea în care vin."
        />
        <div className="mt-10">
          <Roadmap />
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Întrebări"
              title="Pe scurt, ce întreabă toată lumea"
            />
            <Link
              href="/intrebari-frecvente"
              className={buttonVariants({ variant: "outline" })}
            >
              Toate întrebările
              <ArrowRight aria-hidden />
            </Link>
          </div>
          <FaqList items={faqTeaser} />
        </div>
      </Section>

      <CtaBand
        title="Fă primul deviz în câteva minute."
        lead="Descrii lucrarea, verifici propunerea și trimiți oferta pe link. Gratuit, fără card bancar."
        secondary={{ href: appLinks.enter, label: "Intră în aplicație" }}
      />
    </>
  );
}
