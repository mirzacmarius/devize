"use client";

import { useCallback } from "react";
import { appErrorOf } from "@/lib/errors";
import { useScopedI18n } from "@/locales/client";
import type { Dictionary } from "@/locales/types";

type ErrorKey = keyof Dictionary["offerPage"]["errors"];

const codeKeys: Record<string, ErrorKey> = {
  locked: "locked",
  not_found: "notFound",
  forbidden: "preview",
};

const invalidKeys: Record<string, ErrorKey> = {
  name: "name",
  signature: "signature",
  reason: "reason",
  excludedItemIds: "empty",
};

/**
 * Turns an error from answering an Ofertă into a sentence for its client,
 * who has no account and none of the app's vocabulary.
 */
export function useOfferError() {
  const t = useScopedI18n("offerPage.errors");
  return useCallback(
    (error: unknown) => {
      const appError = appErrorOf(error);
      const key =
        appError?.code === "invalid"
          ? invalidKeys[appError.detail ?? ""]
          : appError && codeKeys[appError.code];
      return t(key || "unknown");
    },
    [t],
  );
}
