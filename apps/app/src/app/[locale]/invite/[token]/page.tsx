import type { Metadata } from "next";
import { StandalonePage } from "@/components/standalone-page";
import { getScopedI18n } from "@/locales/server";
import { InvitationPage } from "./_components/invitation-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("invite");
  return { title: t("title") };
}

export default function Page() {
  return (
    <StandalonePage>
      <InvitationPage />
    </StandalonePage>
  );
}
