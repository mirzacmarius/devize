import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/content/faq";

/** Questions that open one by one; no script needed. */
export function FaqList({ items }: { items: ReadonlyArray<FaqItem> }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <details key={item.question} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="m-0 mt-3 max-w-2xl text-pretty text-body text-ink-2">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

/** The FAQPage structured data for a list of questions. */
export function faqJsonLd(items: ReadonlyArray<FaqItem>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
