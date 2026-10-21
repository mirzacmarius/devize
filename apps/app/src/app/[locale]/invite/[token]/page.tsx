import type { Metadata } from "next";
import { StandalonePage } from "@/components/standalone-page";
import { getScopedI18n } from "@/locales/server";
import { InvitationPage } from "./_components/invitation-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("invite");
  return { title: t("title") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <StandalonePage>
      <InvitationPage token={token} />
    </StandalonePage>
  );
}
