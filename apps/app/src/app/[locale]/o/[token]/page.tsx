import { api } from "@devize/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
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
  // A preview in a chat names the firm; anything else falls back to a plain title.
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

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <OfferPage token={token} />;
}
