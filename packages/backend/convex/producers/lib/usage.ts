// The rules of a Producător's usage statistics that the app shows too. No
// imports, so the app can use them.

/** The months the statistics cover, the current one last. */
export const STATS_MONTHS = 12;

/**
 * A county shows on its own once this many firms used the producer there;
 * fewer would point at the firms, so they count among the other counties.
 */
export const MIN_FIRMS_PER_COUNTY = 3;
