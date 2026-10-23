import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { BasketPage } from "./_components/basket-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("prices.basket");
  return { title: t("title") };
}

export default function Page() {
  return <BasketPage />;
}
