import type { Metadata } from "next";
import { StandalonePage } from "@/components/standalone-page";
import { getScopedI18n } from "@/locales/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("onboarding");
  return { title: t("title") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <StandalonePage>{children}</StandalonePage>;
}
