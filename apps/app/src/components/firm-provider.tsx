"use client";

import type { api } from "@devize/backend/convex/_generated/api";
import { type Preloaded, usePreloadedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";

export type Firm = FunctionReturnType<
  typeof api.accounts.organizations.listMine
>[number];

const FirmContext = createContext<{ firm: Firm; firms: Firm[] } | null>(null);

/**
 * The Firmă the user works in: the one they used last. Every page in the
 * dashboard reads it with `useFirm()` and passes its id to the backend.
 */
export function FirmProvider({
  preloadedFirms,
  children,
}: {
  preloadedFirms: Preloaded<typeof api.accounts.organizations.listMine>;
  children: ReactNode;
}) {
  const firms = usePreloadedQuery(preloadedFirms);
  const router = useRouter();
  const firm = firms[0];
  const value = useMemo(() => (firm ? { firm, firms } : null), [firm, firms]);

  // Someone who leaves their last firm starts again from the firm step.
  useEffect(() => {
    if (!firm) {
      router.replace("/onboarding/firm");
    }
  }, [firm, router]);

  if (!value) {
    return null;
  }
  return <FirmContext.Provider value={value}>{children}</FirmContext.Provider>;
}

export function useFirm() {
  const value = useContext(FirmContext);
  if (!value) {
    throw new Error("useFirm() needs a FirmProvider above it");
  }
  return value;
}
