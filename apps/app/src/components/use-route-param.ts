"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

/**
 * A [param] of the page's address, such as the Deviz id of
 * /estimates/[estimateId]. Pages read it here rather than in their server
 * component, so a link's prefetch already holds the page and a click shows it
 * at once (ADR 0029).
 *
 * Next.js keeps the last pages someone left mounted but hidden, so Back
 * restores them as they were, and useParams() in a hidden page follows the
 * address now shown. Each page keeps the value it opened with instead.
 */
export function useRouteParam(name: string): string {
  const value = useParams<Record<string, string>>()[name];
  const [opened] = useState(value);
  if (opened === undefined) {
    throw new Error(`useRouteParam("${name}") needs a page under [${name}]`);
  }
  return opened;
}
