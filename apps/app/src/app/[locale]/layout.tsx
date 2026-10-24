import "@devize/ui/globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { TooltipProvider } from "@devize/ui/tooltip";
import { cn } from "@devize/ui/utils";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { AppToaster } from "@/components/app-toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { brand } from "@/lib/brand";
import { I18nProvider } from "@/locales/client";
import { clientDictionary } from "@/locales/client-dictionary";
import { loaders } from "@/locales/loaders";
import { defaultLocale, isLocale, locales } from "@/locales/locale";
import { getI18n } from "@/locales/server";
import { ConvexClientProvider } from "../convex-client-provider";

/** Every page is built once per language, before anyone signs in. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  return {
    title: { default: t("common.appName"), template: "%s · Devize" },
    description: t("common.appDescription"),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.lightBackground },
    { media: "(prefers-color-scheme: dark)", color: brand.darkBackground },
  ],
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const requested = (await params).locale;
  const locale = isLocale(requested) ? requested : defaultLocale;
  const dictionary = (await loaders[locale]()).default;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          `${GeistSans.variable} ${GeistMono.variable}`,
          "antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={0}>
            <I18nProvider
              locale={locale}
              dictionary={clientDictionary(dictionary)}
            >
              {/* The sign-in reads the request's cookies, so the pages under
                  it stream in after the shell the build prepared (ADR 0029). */}
              <Suspense>
                <Session>{children}</Session>
              </Suspense>
              <AppToaster />
            </I18nProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

/**
 * The signed-in user's session, from the request's cookies. Convex Auth also
 * notes the time it read them, which only a request can give, so it waits for
 * one rather than run in a link's prefetch (ADR 0029).
 */
async function Session({ children }: { children: ReactNode }) {
  await connection();
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
