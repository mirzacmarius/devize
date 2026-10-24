import { env } from "@/env";

/** Where the site's buttons lead in the product app. Safe in client code. */
export const appUrl = env.NEXT_PUBLIC_APP_URL;

export const appLinks = {
  /** "Intră în aplicație": the app, which asks to sign in when needed. */
  enter: appUrl,
  /** "Începe gratuit": straight to the sign-in page. */
  start: `${appUrl}/login`,
  /** The producers' list in the app, where a Producător claims its profile. */
  producers: `${appUrl}/producers`,
  /** The legal documents, which ship with the app. */
  terms: `${appUrl}/termeni`,
  dpa: `${appUrl}/acord-prelucrare-date`,
  privacy: `${appUrl}/confidentialitate`,
} as const;
