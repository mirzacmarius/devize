import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { InvoicePage } from "./_components/invoice-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("invoices");
  return { title: t("title") };
}

export default function Page() {
  return <InvoicePage />;
}
