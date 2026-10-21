"use client";

import { useCallback } from "react";
import { appErrorOf } from "@/lib/errors";
import { useScopedI18n } from "@/locales/client";
import type { Dictionary } from "@/locales/types";

type ErrorKey = keyof Dictionary["errors"];

const codeKeys: Record<string, ErrorKey> = {
  unauthenticated: "unauthenticated",
  forbidden: "forbidden",
  not_found: "notFound",
  invalid: "invalid",
  locked: "locked",
  in_use: "inUse",
};

// The details people can act on; any other detail falls back to its code.
const detailKeys: Record<string, Record<string, ErrorKey>> = {
  invalid: {
    cui: "invalidCui",
    name: "invalidName",
    title: "invalidTitle",
    unit: "invalidUnit",
    price: "invalidPrice",
    unitPrice: "invalidPrice",
    referencePrice: "invalidPrice",
    quantity: "invalidQuantity",
    code: "invalidCode",
    date: "invalidDate",
    length: "invalidLength",
    resources: "invalidResources",
    resourceId: "invalidResourceRate",
  },
  in_use: {
    code: "inUseCode",
    estimates: "inUseEstimates",
    last_owner: "inUseLastOwner",
    sections: "inUseSections",
    lineItems: "inUseSections",
  },
  locked: {
    estimate: "lockedEstimate",
    offer: "lockedOffer",
    published: "lockedNorm",
    review: "lockedNorm",
    superseded: "lockedNorm",
    archived: "lockedNorm",
  },
};

/** Turns an error from a Convex function into a sentence for a toast. */
export function useErrorMessage() {
  const t = useScopedI18n("errors");
  return useCallback(
    (error: unknown) => {
      const appError = appErrorOf(error);
      if (!appError) {
        return t("unknown");
      }
      const key =
        (appError.detail && detailKeys[appError.code]?.[appError.detail]) ||
        codeKeys[appError.code];
      return key ? t(key) : t("unknown");
    },
    [t],
  );
}
