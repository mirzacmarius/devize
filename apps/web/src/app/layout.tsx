import "@devize/ui/globals.css";
import { cn } from "@devize/ui/utils";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devize: devize de construcții cu prețuri la zi",
  description:
    "Devize de construcții cu norme de la producători și prețuri la zi din magazine, plus formularele oficiale pentru licitații.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body
        className={cn(
          `${GeistSans.variable} ${GeistMono.variable}`,
          "antialiased",
        )}
      >
        {children}
      </body>
    </html>
  );
}
