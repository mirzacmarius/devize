export const locales = ["ro", "en"] as const;
export type Locale = (typeof locales)[number];

/** Romanian, unless someone picks English in the language menu. */
export const defaultLocale: Locale = "ro";

/** Each language's own name for itself, as shown in the language menu. */
export const localeNames: Record<Locale, string> = {
  ro: "Română",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}
