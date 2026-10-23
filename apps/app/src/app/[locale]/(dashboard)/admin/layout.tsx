import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@devize/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getScopedI18n } from "@/locales/server";
import { AdminNav } from "./_components/admin-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getScopedI18n("admin");
  return { title: t("title") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // The check reads the sign-in, so it streams in (ADR 0029).
  return (
    <Suspense>
      <StaffOnly>{children}</StaffOnly>
    </Suspense>
  );
}

/** Devize staff only: anyone else gets the not-found page. */
async function StaffOnly({ children }: { children: React.ReactNode }) {
  if (!(await isStaff())) {
    notFound();
  }
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}

/**
 * Whether the signed-in user is Devize staff. The browser keeps the answer for
 * a few minutes, so a link's prefetch already holds the admin pages and opening
 * them is instant (ADR 0029). Every admin function checks again in Convex.
 */
async function isStaff() {
  "use cache: private";
  const token = await convexAuthNextjsToken();
  const viewer = await fetchQuery(api.admin.viewer, {}, { token });
  return viewer.isSuperAdmin;
}
