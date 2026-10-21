"use client";

import "@devize/ui/globals.css";
import { Button } from "@devize/ui/button";
import * as Sentry from "@sentry/nextjs";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { defaultLocale, isLocale, type Locale } from "@/locales/locale";

/**
 * The words of this screen in every language. They can't come from the
 * dictionaries: this screen replaces the root layout that provides them.
 */
const texts: Record<
  Locale,
  { title: string; description: string; reload: string }
> = {
  ro: {
    title: "Ceva n-a mers bine",
    description: "Devize nu a putut fi afișat. Reîncarcă pagina.",
    reload: "Reîncarcă pagina",
  },
  en: {
    title: "Something went wrong",
    description: "Devize couldn't be shown. Reload the page to try again.",
    reload: "Reload page",
  },
};

/**
 * Shown in place of the whole app when it fails outside a page (its root
 * layout), in the language the page was in. It reports the error and offers
 * a reload.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const requested = useParams()?.locale;
  const locale = isLocale(requested) ? requested : defaultLocale;
  const t = texts[locale];
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang={locale}>
      <body className="bg-background text-foreground antialiased">
        <title>{t.title}</title>
        <main className="flex min-h-dvh items-center justify-center px-4">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <h1 className="text-lg font-medium">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.description}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t.reload}
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
