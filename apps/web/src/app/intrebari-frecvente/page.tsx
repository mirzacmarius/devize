import type { Metadata } from "next";
import { CtaBand } from "@/components/cta";
import { FaqList, faqJsonLd } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { faqGroups } from "@/content/faq";

const title = "Întrebări frecvente";
const description =
  "Răspunsuri despre Devize: de unde vin normele și prețurile, cum merg licitațiile și ofertele pe link, ce face Devize AI, cum publică producătorii norme și cum sunt păstrate datele.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/intrebari-frecvente" },
  openGraph: { title, description, url: "/intrebari-frecvente" },
};

const allItems = faqGroups.flatMap((group) => group.items);

export default function Page() {
  return (
    <>
      <JsonLd data={faqJsonLd(allItems)} />

      <PageHero
        eyebrow="Întrebări frecvente"
        title="Ce întreabă constructorii și producătorii."
        lead="Răspunsuri scurte despre norme, prețuri, licitații, oferte, inteligența artificială și date. Dacă nu găsești întrebarea ta, scrie-ne din aplicație."
      />

      <Section className="py-10 md:py-16">
        <div className="flex flex-col gap-14">
          {faqGroups.map((group) => (
            <div
              key={group.title}
              className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16"
            >
              <h2 className="m-0 text-balance text-[26px] font-light leading-[32px] tracking-[-0.01em] text-ink lg:sticky lg:top-24 lg:self-start">
                {group.title}
              </h2>
              <FaqList items={group.items} />
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Restul se vede mai bine în aplicație."
        lead="Fă un deviz de probă în câteva minute. Gratuit, fără card bancar."
        secondary={{
          href: "/preturi",
          label: "Vezi prețurile",
          internal: true,
        }}
      />
    </>
  );
}
