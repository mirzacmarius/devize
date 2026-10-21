import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { SystemsPage } from "../_components/systems-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("compatibility.producerSystems");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function Page({
  params,
}: {
  params: Promise<{ manufacturerId: string }>;
}) {
  const { manufacturerId } = await params;
  return <SystemsPage manufacturerId={manufacturerId as Id<"manufacturers">} />;
}
