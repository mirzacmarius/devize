import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { NormForm } from "../_components/norm-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("norm");
  return { title: t("form.newTitle") };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  // The producer profile's "Normă nouă" opens the form on the producer's side.
  const { for: owner } = await searchParams;
  return (
    <NormForm
      initialOwner={owner === "producer" ? "manufacturer" : "organization"}
    />
  );
}
