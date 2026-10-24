import { cn } from "@devize/ui/utils";
import type { ReactNode } from "react";

/** The page's column: 1152px wide, with the phone's 16px gutter. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function Section({
  id,
  className,
  sunken,
  children,
}: {
  id?: string;
  className?: string;
  /** On the `sunken` surface, to set it off from its neighbours. */
  sunken?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-16 py-16 md:py-24",
        sunken && "bg-sunken",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** The small line above a title, with the brand dot: the site's only lime. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 inline-flex items-center gap-2 text-label uppercase text-ink-3">
      <span aria-hidden className="size-2 rounded-full bg-brand" />
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        "m-0 max-w-3xl text-balance text-[30px] font-light leading-[36px] tracking-[-0.015em] text-ink md:text-[40px] md:leading-[46px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Lead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "m-0 max-w-2xl text-pretty text-body-lg text-ink-2 md:text-[17px] md:leading-[26px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Eyebrow, title and lead, stacked at the top of a section. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  as,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="flex flex-col gap-4">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <SectionTitle as={as}>{title}</SectionTitle>
      {lead && <Lead>{lead}</Lead>}
    </div>
  );
}
