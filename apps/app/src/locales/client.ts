"use client";

import { createI18nClient } from "next-international/client";
import {
  type ContextType,
  createElement,
  type ReactNode,
  useMemo,
} from "react";
import type { ClientDictionary } from "./client-dictionary";
import { loaders } from "./loaders";
import type { Locale } from "./locale";

export const {
  useI18n,
  useScopedI18n,
  useChangeLocale,
  useCurrentLocale,
  I18nClientContext,
} = createI18nClient(loaders);

type FlatDictionary = Record<string, string>;

/** { login: { title: "…" } } → { "login.title": "…" }, the shape the translate functions read. */
function flatten(
  dictionary: object,
  prefix = "",
  flat: FlatDictionary = {},
): FlatDictionary {
  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value === "string") flat[prefix + key] = value;
    else flatten(value, `${prefix}${key}.`, flat);
  }
  return flat;
}

/**
 * Gives client components the dictionary the server already loaded, without
 * the scopes only server components print (client-dictionary.ts). The
 * library's own provider imports it again in the browser and suspends while it
 * does, which makes React 19 throw away the server-rendered page on hydration.
 */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: ClientDictionary;
  children: ReactNode;
}) {
  const value = useMemo(
    () =>
      ({ locale, localeContent: flatten(dictionary) }) as ContextType<
        typeof I18nClientContext
      >,
    [locale, dictionary],
  );
  return createElement(I18nClientContext.Provider, { value }, children);
}
