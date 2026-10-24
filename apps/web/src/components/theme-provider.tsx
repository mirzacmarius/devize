"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = Omit<
  ComponentProps<typeof NextThemesProvider>,
  "scriptProps"
>;

/**
 * next-themes, with its inline theme script made inert outside the server, as
 * in the app: the script only has to run while the browser parses the page's
 * HTML, and React warns about a script it renders itself on the client.
 */
export function ThemeProvider(props: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    />
  );
}
