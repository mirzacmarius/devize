import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@devize/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getScopedI18n } from "@/locales/server";
import { AdminNav } from "./_components/admin-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("admin");
  return { title: t("title") };
}

/** Devize staff only: anyone else gets the not-found page. */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await convexAuthNextjsToken();
  const viewer = await fetchQuery(api.admin.viewer, {}, { token });
  if (!viewer.isSuperAdmin) {
    notFound();
  }
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
