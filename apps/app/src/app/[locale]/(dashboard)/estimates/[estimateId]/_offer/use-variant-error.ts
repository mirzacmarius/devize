"use client";

import { useCallback } from "react";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { useScopedI18n } from "@/locales/client";

const invalidKeys = {
  name: "name",
  description: "description",
  variants: "tooMany",
  unitPrice: "price",
  materialName: "typedName",
  swaps: "swaps",
} as const;

/**
 * Turns an error from the Variante's functions into a sentence. `unit` is the
 * unit of the material being swapped, for a material counted otherwise.
 */
export function useVariantError() {
  const t = useScopedI18n("offer.variants");
  const errorMessage = useErrorMessage();
  return useCallback(
    (error: unknown, unit = "") => {
      const appError = appErrorOf(error);
      if (appError?.code === "in_use" && appError.detail === "name") {
        return t("errors.nameTaken");
      }
      if (appError?.code === "locked") {
        return t("errors.locked");
      }
      if (appError?.code === "invalid") {
        if (appError.detail === "unit") {
          return t("errors.unit", { unit });
        }
        const key =
          appError.detail && appError.detail in invalidKeys
            ? invalidKeys[appError.detail as keyof typeof invalidKeys]
            : undefined;
        if (key) {
          return t(`errors.${key}`);
        }
      }
      return errorMessage(error);
    },
    [t, errorMessage],
  );
}
