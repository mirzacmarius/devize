import type { Dictionary } from "./types";

/**
 * The scopes only server components print: the terms of use, the data
 * processing agreement and the privacy policy, on their public pages. Their
 * texts are long, and the dictionary client components read is sent with
 * every page.
 */
export const serverOnlyScopes = ["terms", "dpa", "privacy"] as const;

type ServerOnlyScope = (typeof serverOnlyScopes)[number];

export type ClientDictionary = Omit<Dictionary, ServerOnlyScope>;

const serverOnly = new Set<string>(serverOnlyScopes);

/** What the root layout hands to client components: all but those scopes. */
export function clientDictionary(dictionary: Dictionary): ClientDictionary {
  return Object.fromEntries(
    Object.entries(dictionary).filter(([scope]) => !serverOnly.has(scope)),
  ) as ClientDictionary;
}
