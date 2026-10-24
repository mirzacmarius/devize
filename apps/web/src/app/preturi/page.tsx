import { Check, Info } from "lucide-react";
import type { Metadata } from "next";
import { CtaBand } from "@/components/cta";
import { FaqList } from "@/components/faq-list";
import { PageHero } from "@/components/page-hero";
import { PricingCards, ProducerPlanCard } from "@/components/pricing-cards";
import { Section, SectionHeader } from "@/components/section";
import { pricingFaq } from "@/content/pricing";

const title = "Prețuri: un preț pe firmă, utilizatori nelimitați";
const description =
  "Planurile propuse pentru Devize: Gratuit, Pro și Echipă, pe firmă, cu utilizatori nelimitați. Producătorii publică gratuit. Aplicația nu are încă limite sau plăți.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/preturi" },
  openGraph: { title, description, url: "/preturi" },
};

const included = [
  "Norme de bază și norme de producător, cu versiuni",
  "Prețuri din magazine, citite la cerere, cu data citirii",
  "Formularele oficiale F1–F6, DG, DO, C5–C9 și formularul de ofertă",
  "Oferta pe link, cu variante, lucrări opționale și semnătură",
  "Aplicația pe telefon, cu poze și dictare",
  "Utilizatori nelimitați, pe firmă",
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Prețuri"
        title="Un preț pe firmă, oricâți colegi."
        lead="Fără preț pe utilizator, fără contract pe termen lung, fără reînnoiri ascunse. Planurile de mai jos sunt cele pe care le propunem pentru lansare."
      />

      <Section>
        <div className="mb-10 flex items-start gap-3 rounded-lg border border-border bg-sunken p-5 text-body text-ink-2">
          <Info
            aria-hidden
            className="mt-0.5 size-[18px] shrink-0 text-ink-3"
          />
          <p className="m-0 max-w-3xl">
            <span className="font-medium text-ink">
              Propunere, nu listă de prețuri.
            </span>{" "}
            Devize e înainte de lansare: aplicația nu are limite de plan și nu
            se plătește nimic. Planurile și prețurile pot fi ajustate înainte să
            pornească plățile, iar cine folosește Devize acum află din timp.
          </p>
        </div>
        <PricingCards />
        <p className="m-0 mt-4 text-meta text-ink-3">
          Prețurile sunt pe lună, pe firmă, fără TVA.
        </p>
      </Section>

      <Section sunken>
        <SectionHeader
          eyebrow="În toate planurile"
          title="Ce primește orice firmă, indiferent de plan"
        />
        <ul className="m-0 mt-10 grid gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {included.map((item) => (
            <li
              key={item}
              className="flex list-none items-start gap-2.5 rounded-lg border border-card-border bg-card p-4 text-body text-ink-2 shadow-card"
            >
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-ink-3"
              />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="producatori">
        <SectionHeader
          eyebrow="Producători"
          title="Publicarea e gratuită. Statisticile, nu."
          lead="Producătorii nu plătesc ca să fie în catalog. Plătesc, dacă vor, ca să afle lună de lună cum ajung produsele lor în devize."
        />
        <div className="mt-10">
          <ProducerPlanCard />
        </div>
      </Section>

      <Section sunken>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <SectionHeader eyebrow="Întrebări" title="Despre plată" />
          <FaqList items={pricingFaq} />
        </div>
      </Section>

      <CtaBand
        title="Începe cu planul gratuit."
        lead="Fără card bancar. Când pornesc plățile, alegi planul potrivit firmei tale."
        secondary={{
          href: "/intrebari-frecvente",
          label: "Întrebări frecvente",
          internal: true,
        }}
      />
    </>
  );
}
