import type { ReactNode } from "react";
import { Container, Eyebrow, Lead } from "./section";

/** The top of a page under the home page: eyebrow, title, lead, actions. */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <Container className="flex flex-col gap-6 py-16 md:py-24">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="m-0 max-w-4xl text-balance text-[36px] font-light leading-[42px] tracking-[-0.02em] text-ink md:text-[52px] md:leading-[58px]">
          {title}
        </h1>
        <Lead className="md:text-[18px] md:leading-[28px]">{lead}</Lead>
        {children}
      </Container>
    </section>
  );
}
