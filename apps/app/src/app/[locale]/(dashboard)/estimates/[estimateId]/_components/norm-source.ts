"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { useScopedI18n } from "@/locales/client";

/** Whose norm it is: "normă de bază", "normă ROCKWOOL", "normă proprie". */
export function useNormSource() {
  const t = useScopedI18n("estimate");
  return (norm: {
    source: Doc<"norms">["source"];
    manufacturerName?: string;
  }) =>
    norm.source === "manufacturer"
      ? t("origins.manufacturer", {
          name: norm.manufacturerName ?? t("origins.unknownManufacturer"),
        })
      : t(`origins.${norm.source}`);
}
