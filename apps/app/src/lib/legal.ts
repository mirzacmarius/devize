/**
 * Where Devize's legal documents are: public pages anyone can open, which the
 * sign-in page, the firm step, the website's footer and each other link to.
 */
export const legalPaths = {
  terms: "/termeni",
  dpa: "/acord-prelucrare-date",
  privacy: "/confidentialitate",
} as const;

export type LegalDocument = keyof typeof legalPaths;
