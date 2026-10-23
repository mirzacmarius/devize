import { api } from "@devize/backend/convex/_generated/api";
import { AppMain, AppShell, AppSidebar } from "@devize/ui/app-shell";
import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FirmProvider } from "@/components/firm-provider";
import { convexToken } from "@/lib/convex-server";
import { MobileNav } from "./_components/mobile-nav";
import { SidebarContent } from "./_components/sidebar-content";

/**
 * The app's frame. Its user and firms come from Convex on every request, so
 * coming from a page outside it shows the empty frame at once and fills it as
 * they arrive (ADR 0029).
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <AppSidebar />
          <AppMain />
        </AppShell>
      }
    >
      <Dashboard>{children}</Dashboard>
    </Suspense>
  );
}

async function Dashboard({ children }: { children: React.ReactNode }) {
  const token = await convexToken();
  const user = await fetchQuery(api.users.getUser, {}, { token });
  if (!user?.username) {
    return redirect("/onboarding");
  }
  const [preloadedUser, preloadedFirms, { isSuperAdmin }] = await Promise.all([
    preloadQuery(api.users.getUser, {}, { token }),
    preloadQuery(api.accounts.organizations.listMine, {}, { token }),
    fetchQuery(api.admin.viewer, {}, { token }),
  ]);
  // Every Deviz, client and rate belongs to a Firmă, so create one first.
  if (preloadedQueryResult(preloadedFirms).length === 0) {
    return redirect("/onboarding/firm");
  }
  return (
    <FirmProvider preloadedFirms={preloadedFirms}>
      <AppShell>
        <AppSidebar>
          <SidebarContent
            preloadedUser={preloadedUser}
            isSuperAdmin={isSuperAdmin}
          />
        </AppSidebar>
        <AppMain>
          <MobileNav
            preloadedUser={preloadedUser}
            isSuperAdmin={isSuperAdmin}
          />
          {children}
        </AppMain>
      </AppShell>
    </FirmProvider>
  );
}
