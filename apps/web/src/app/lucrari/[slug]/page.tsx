import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/cta";
import { FaqList, faqJsonLd } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { Section, SectionHeader } from "@/components/section";
import { Steps } from "@/components/steps";
import { workBySlug, works } from "@/content/works";
import { absolute } from "@/lib/site-url";

/** Every work's page is built once. */
export function generateStaticParams() {
  return works.map((work) => ({ slug: work.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const work = workBySlug((await params).slug);
  if (!work) return {};
  return {
    title: work.metaTitle,
    description: work.description,
    alternates: { canonical: `/lucrari/${work.slug}` },
    openGraph: {
      title: work.metaTitle,
      description: work.description,
      url: `/lucrari/${work.slug}`,
    },
  };
}

const howTo = [
  {
    title: "Descrii lucrarea",
    description:
      "În cuvintele tale, cu pozele încăperii sau ale clădirii. Devize AI propune articolele de mai sus, cu norme și cantități.",
  },
  {
    title: "Verifici cantitățile și prețurile",
    description:
      "Fiecare articol spune de unde are prețul: al tău, din magazin, cu data citirii, sau de referință.",
  },
  {
    title: "Lași detectorul să citească",
    description:
      "Omisiunile de mai sus sunt exact ce caută detectorul: le propune cu motivul și cantitatea, tu confirmi.",
  },
  {
    title: "Trimiți oferta pe link",
    description:
      "Clientul alege varianta, bifează opționalele și semnează pe telefon. Apoi ai lista de cumpărături în ambalaje întregi.",
  },
] as const;

export default async function Page({ params }: { params: Params }) {
  const work = workBySlug((await params).slug);
  if (!work) notFound();

  const related = work.related
    .map((slug) => workBySlug(slug))
    .filter((item) => item !== undefined);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Devize", item: absolute("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "Lucrări",
        item: absolute("/lucrari"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: work.short,
        item: absolute(`/lucrari/${work.slug}`),
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faqJsonLd(work.faq)} />

      <PageHero eyebrow="Deviz pe lucrare" title={work.title} lead={work.intro}>
        <nav aria-label="Ești aici" className="text-meta text-ink-3">
          <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
            <li>
              <Link href="/" className="hover:text-ink">
                Devize
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/lucrari" className="hover:text-ink">
                Lucrări
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink-2">
              {work.short}
            </li>
          </ol>
        </nav>
      </PageHero>

      <Section>
        <SectionHeader
          eyebrow="Capitole"
          title="Ce cuprinde devizul"
          lead="Articolele tipice ale fiecărui capitol, cu unitatea lor de măsură. Cantitățile sunt ale tale; prețul iese din normele și magazinul tău."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {work.chapters.map((chapter, index) => (
            <div
              key={chapter.name}
              className="flex flex-col rounded-lg border border-card-border bg-card shadow-card"
            >
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="font-mono text-code text-ink-3 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="m-0 text-title-card text-ink">{chapter.name}</h3>
              </div>
              <hr className="tick-rule m-0 mx-5 border-0" />
              <ul className="m-0 flex list-none flex-col p-0">
                {chapter.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-baseline justify-between gap-4 border-t border-border px-5 py-2.5 text-body first:border-t-0"
                  >
                    <span className="text-ink">{item.name}</span>
                    <span className="shrink-0 font-mono text-code text-ink-3">
                      {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section sunken>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeader eyebrow="Preț" title="Ce influențează prețul" />
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {work.priceDrivers.map((driver) => (
                <li
                  key={driver}
                  className="flex items-start gap-2.5 text-body text-ink-2"
                >
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-ink-3"
                  />
                  {driver}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-6">
            <SectionHeader eyebrow="Omisiuni" title="Ce se uită cel mai des" />
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {work.omissions.map((omission) => (
                <li
                  key={omission}
                  className="flex items-start gap-2.5 text-body text-ink-2"
                >
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-warning"
                  />
                  {omission}
                </li>
              ))}
            </ul>
            <p className="m-0 rounded-md border border-ai-border bg-card p-4 text-body text-ink-2">
              <span className="font-medium text-ai">
                Detectorul de omisiuni
              </span>{" "}
              le caută exact pe acestea în devizul tău și le propune cu motivul
              și cantitatea, de confirmat.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Norme de producător"
          title="Unde contează producătorul"
          lead={work.producers}
        />
      </Section>

      <Section sunken>
        <SectionHeader
          eyebrow="În Devize"
          title={`Cum faci devizul pentru ${work.short.toLowerCase()} în Devize`}
        />
        <div className="mt-12">
          <Steps steps={howTo} />
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <SectionHeader
            eyebrow="Întrebări"
            title="Întrebări despre această lucrare"
          />
          <FaqList items={work.faq} />
        </div>
      </Section>

      {related.length > 0 && (
        <Section sunken className="py-10 md:py-14">
          <h2 className="m-0 text-label uppercase text-ink-3">
            Lucrări înrudite
          </h2>
          <ul className="m-0 mt-4 grid gap-3 p-0 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug} className="list-none">
                <Link
                  href={`/lucrari/${item.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-card-border bg-card px-5 py-4 text-body font-medium text-ink shadow-card transition-colors hover:bg-tile"
                >
                  {item.short}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <CtaBand
        title={`Fă devizul pentru ${work.short.toLowerCase()} în Devize.`}
        lead="Descrii lucrarea, verifici propunerea și trimiți oferta pe link. Gratuit, fără card bancar."
        secondary={{ href: "/lucrari", label: "Alte lucrări", internal: true }}
      />
    </>
  );
}
