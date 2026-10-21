import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { EstimatePage } from "./_components/estimate-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("estimates");
  return { title: t("title") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ estimateId: string }>;
}) {
  const { estimateId } = await params;
  return <EstimatePage estimateId={estimateId as Id<"estimates">} />;
}
