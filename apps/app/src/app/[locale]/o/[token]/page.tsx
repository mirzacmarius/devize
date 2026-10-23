import { api } from "@devize/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getScopedI18n } from "@/locales/server";
import { OfferPage } from "./_components/offer-page";

/**
 * An Ofertă's link, which the firm sends its client. The token in the address
 * is its only key, so search engines don't index it and the pages it links to
 * aren't told where the visitor came from.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const t = await getScopedI18n("offerPage");
  const { token } = await params;
  // A preview in a chat names the firm; anything else falls back to a plain
  // title. Like every Convex read on the server, it waits for the request
  // (lib/convex-server.ts).
  await connection();
  const offer = await fetchQuery(api.offers.public.view, { token }).catch(
    () => null,
  );
  const title = offer ? t("titleFrom", { firm: offer.firm.name }) : t("title");
  const description = offer?.title ?? t("description");
  return {
    title,
    description,
    openGraph: { title, description },
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default function Page() {
  return (
    <>
      <OfferPage />
      <Suspense>
        <AtRequest />
      </Suspense>
    </>
  );
}

/**
 * Nothing to show: it tells Next.js the page renders for each request, which
 * it asks for when a page's title does (ADR 0029).
 */
async function AtRequest() {
  await connection();
  return null;
}
