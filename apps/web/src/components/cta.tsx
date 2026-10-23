import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { appLinks } from "@/lib/links";
import { Container } from "./section";

/** "Începe gratuit" and a second button, side by side. */
export function Actions({
  primary = { href: appLinks.start, label: "Începe gratuit" },
  secondary,
  className,
}: {
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string; internal?: boolean };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <a href={primary.href} className={buttonVariants({ size: "lg" })}>
        {primary.label}
      </a>
      {secondary &&
        (secondary.internal ? (
          <Link
            href={secondary.href}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {secondary.label}
            <ArrowRight aria-hidden />
          </Link>
        ) : (
          <a
            href={secondary.href}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {secondary.label}
            <ArrowRight aria-hidden />
          </a>
        ))}
    </div>
  );
}

/** The page's closing invitation. */
export function CtaBand({
  title,
  lead,
  primary,
  secondary,
}: {
  title: string;
  lead: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string; internal?: boolean };
}) {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="flex flex-col items-start gap-6 rounded-xl border border-border bg-sunken p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="m-0 text-balance text-[28px] font-light leading-[34px] tracking-[-0.015em] text-ink md:text-title-page">
              {title}
            </h2>
            <p className="m-0 text-body-lg text-ink-2">{lead}</p>
          </div>
          <Actions
            primary={primary}
            secondary={secondary}
            className="shrink-0"
          />
        </div>
      </Container>
    </section>
  );
}
