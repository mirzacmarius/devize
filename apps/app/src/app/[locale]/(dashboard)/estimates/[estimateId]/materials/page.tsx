import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { MaterialsPage } from "./_components/materials-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("materials");
  return { title: t("title") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ estimateId: string }>;
}) {
  const { estimateId } = await params;
  return <MaterialsPage estimateId={estimateId as Id<"estimates">} />;
}
