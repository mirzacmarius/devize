import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/cta";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { works } from "@/content/works";

const title = "Devize pe tipuri de lucrări";
const description =
  "Ce cuprinde devizul pentru fiecare tip de lucrare, de la renovarea băii la casa la roșu: capitole, articole cu unități de măsură, ce influențează prețul și ce se uită cel mai des.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/lucrari" },
  openGraph: { title, description, url: "/lucrari" },
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Lucrări"
        title="Devizul, pe tipuri de lucrări."
        lead="Pentru fiecare lucrare uzuală: capitolele devizului, articolele cu unitățile lor de măsură, ce influențează prețul și omisiunile pe care detectorul le prinde. Fără prețuri de-a gata: prețul tău iese din cantitățile tale și din magazinul tău."
      />

      <Section className="py-10 md:py-16">
        <ul className="m-0 grid gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work) => (
            <li key={work.slug} className="list-none">
              <Link
                href={`/lucrari/${work.slug}`}
                className="group flex h-full flex-col gap-3 rounded-lg border border-card-border bg-card p-5 shadow-card transition-colors hover:bg-tile"
              >
                <h2 className="m-0 text-title-card text-ink">{work.short}</h2>
                <p className="m-0 text-pretty text-body text-ink-2">
                  {work.description}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-meta text-ink-3">
                  {work.chapters.length} capitole
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand
        title="Devizul tău, din cantitățile tale."
        lead="Descrii lucrarea și Devize AI propune articolele, cu norme și prețuri de azi."
        secondary={{
          href: "/constructori",
          label: "Cum lucrează constructorii",
          internal: true,
        }}
      />
    </>
  );
}
