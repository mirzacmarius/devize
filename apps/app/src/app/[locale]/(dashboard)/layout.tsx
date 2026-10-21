import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@devize/backend/convex/_generated/api";
import { AppMain, AppShell, AppSidebar } from "@devize/ui/app-shell";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { MobileNav } from "./_components/mobile-nav";
import { SidebarContent } from "./_components/sidebar-content";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await convexAuthNextjsToken();
  const user = await fetchQuery(api.users.getUser, {}, { token });
  if (!user?.username) {
    return redirect("/onboarding");
  }
  const preloadedUser = await preloadQuery(api.users.getUser, {}, { token });
  return (
    <AppShell>
      <AppSidebar>
        <SidebarContent preloadedUser={preloadedUser} />
      </AppSidebar>
      <AppMain>
        <MobileNav preloadedUser={preloadedUser} />
        {children}
      </AppMain>
    </AppShell>
  );
}
