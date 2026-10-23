import type { Metadata } from "next";
import { getScopedI18n } from "@/locales/server";
import { ProfilePage } from "./_components/profile-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("producers");
  // Profiles are for the app's users; search engines get the producer's own site.
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function Page() {
  return <ProfilePage />;
}
