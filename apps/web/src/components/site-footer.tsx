import Link from "next/link";
import { works } from "@/content/works";
import { appLinks } from "@/lib/links";
import { Wordmark } from "./wordmark";

const groups = [
  {
    title: "Produs",
    links: [
      { href: "/constructori", label: "Pentru constructori" },
      { href: "/producatori", label: "Pentru producători" },
      { href: "/preturi", label: "Prețuri" },
      { href: "/intrebari-frecvente", label: "Întrebări frecvente" },
    ],
  },
  {
    title: "Devize pe lucrări",
    links: works.slice(0, 6).map((work) => ({
      href: `/lucrari/${work.slug}`,
      label: work.short,
    })),
  },
  {
    title: "Aplicația",
    links: [
      { href: appLinks.start, label: "Începe gratuit", external: true },
      { href: appLinks.enter, label: "Intră în aplicație", external: true },
      {
        href: appLinks.producers,
        label: "Revendică un profil de producător",
        external: true,
      },
      {
        href: appLinks.privacy,
        label: "Politica de confidențialitate",
        external: true,
      },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sunken">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-xs text-body text-ink-2">
            Devize de construcții cu norme publicate de producători, prețuri
            citite din magazine și formularele oficiale pentru licitații.
          </p>
        </div>
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h2 className="m-0 text-label uppercase text-ink-3">
              {group.title}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {group.links.map((link) => (
                <li key={link.href}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      className="text-body text-ink-2 hover:text-ink"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-body text-ink-2 hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-meta text-ink-3 sm:px-6">
          <span>© 2026 Devize</span>
          <span>Făcut în România, pentru constructori și producători.</span>
        </div>
      </div>
    </footer>
  );
}
