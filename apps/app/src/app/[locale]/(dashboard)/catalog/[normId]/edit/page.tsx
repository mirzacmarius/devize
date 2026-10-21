import type { Id } from "@devize/backend/convex/_generated/dataModel";
import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { EditNorm } from "./edit-norm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("catalog");
  return { title: t("title") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ normId: string }>;
}) {
  const { normId } = await params;
  return <EditNorm normId={normId as Id<"norms">} />;
}
