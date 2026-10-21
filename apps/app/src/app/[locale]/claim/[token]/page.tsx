import type { Metadata } from "next";
import { StandalonePage } from "@/components/standalone-page";
import { getScopedI18n } from "@/locales/server";
import { ClaimPage } from "./_components/claim-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("claim");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <StandalonePage>
      <ClaimPage token={token} />
    </StandalonePage>
  );
}
