import "@devize/ui/globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { TooltipProvider } from "@devize/ui/tooltip";
import { cn } from "@devize/ui/utils";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { brand } from "@/lib/brand";
import { I18nProvider } from "@/locales/client";
import { loaders } from "@/locales/loaders";
import { defaultLocale, isLocale } from "@/locales/locale";
import { getI18n } from "@/locales/server";
import { ConvexClientProvider } from "../convex-client-provider";

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
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const requested = (await params).locale;
  const locale = isLocale(requested) ? requested : defaultLocale;
  const dictionary = (await loaders[locale]()).default;
  return (
    <ConvexAuthNextjsServerProvider>
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
              <I18nProvider locale={locale} dictionary={dictionary}>
                <ConvexClientProvider>{children}</ConvexClientProvider>
              </I18nProvider>
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
