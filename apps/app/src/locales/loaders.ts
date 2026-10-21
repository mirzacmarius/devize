import type { Locale } from "./locale";
import type { Dictionary } from "./types";

/** One dictionary per supported language; a language without one fails typecheck. */
export const loaders = {
  ro: () => import("./ro"),
  en: () => import("./en"),
} satisfies Record<Locale, () => Promise<{ default: Dictionary }>>;
