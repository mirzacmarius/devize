"use client";

import { Toaster } from "@devize/ui/sonner";
import { useTheme } from "next-themes";

/** The toasts, in the theme the page is showing. */
export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
    />
  );
}
