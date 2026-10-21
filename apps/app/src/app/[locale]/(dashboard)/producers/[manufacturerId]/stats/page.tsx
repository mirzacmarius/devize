import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { StatsPage } from "../_components/stats-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("producers");
  return { title: t("stats.title"), robots: { index: false, follow: false } };
}

export default async function Page({
  params,
}: {
  params: Promise<{ manufacturerId: string }>;
}) {
  const { manufacturerId } = await params;
  return <StatsPage manufacturerId={manufacturerId as Id<"manufacturers">} />;
}
