"use client";

import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { useScopedI18n } from "@/locales/client";

/** Whose norm it is: "normă de bază", "normă ROCKWOOL", "normă proprie". */
export function useNormSource() {
  const t = useScopedI18n("norms");
  return (norm: {
    source: Doc<"norms">["source"];
    manufacturerName?: string;
  }) =>
    norm.source === "manufacturer"
      ? t("sources.manufacturer", {
          name: norm.manufacturerName ?? t("sources.unknownManufacturer"),
        })
      : t(`sources.${norm.source}`);
}
