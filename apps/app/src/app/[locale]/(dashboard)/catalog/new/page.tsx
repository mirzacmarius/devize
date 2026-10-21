import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { NormForm } from "../_components/norm-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("norm");
  return { title: t("form.newTitle") };
}

export default function Page() {
  return <NormForm />;
}
