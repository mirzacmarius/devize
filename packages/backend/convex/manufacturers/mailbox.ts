import { v } from "convex/values";
import { api } from "../_generated/api";
import { action } from "../_generated/server";
import {
  DKIM_SELECTORS,
  hasDkim,
  hasDmarc,
  hasSpf,
  PROVIDER_DOMAINS,
  txtRecords,
} from "./lib/mailbox";
import { emailDomain } from "./lib/text";

// Google's public resolver, read over HTTPS since actions can't query DNS.
const DOH_URL = "https://dns.google/resolve";
const TIMEOUT_MS = 5000;

async function lookupTxt(name: string): Promise<string[] | null> {
  try {
    const response = await fetch(
      `${DOH_URL}?${new URLSearchParams({ name, type: "TXT" })}`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      return null;
    }
    return txtRecords(await response.json());
  } catch {
    return null;
  }
}

type DomainCheck =
  | { outcome: "none" }
  | { outcome: "provider" | "unavailable"; domain: string }
  | {
      outcome: "checked";
      domain: string;
      spf: boolean;
      dmarc: boolean;
      dkim: string | null;
    };

/**
 * "Verifică domeniul" in the settings: whether the saved mailbox's domain
 * publishes SPF, DMARC and a DKIM key under one of the usual selectors. A
 * free mailbox (Gmail, Yahoo) has them from its provider, so it isn't looked
 * up. Nothing is stored.
 */
export const checkSenderDomain = action({
  args: {},
  returns: v.union(
    v.object({ outcome: v.literal("none") }),
    v.object({ outcome: v.literal("provider"), domain: v.string() }),
    v.object({ outcome: v.literal("unavailable"), domain: v.string() }),
    v.object({
      outcome: v.literal("checked"),
      domain: v.string(),
      spf: v.boolean(),
      dmarc: v.boolean(),
      dkim: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx): Promise<DomainCheck> => {
    // Only super admins read the settings.
    const settings: { senderEmail?: string } = await ctx.runQuery(
      api.manufacturers.outreach.getSettings,
      {},
    );
    const domain = settings.senderEmail
      ? emailDomain(settings.senderEmail)
      : undefined;
    if (!domain) {
      return { outcome: "none" };
    }
    if (PROVIDER_DOMAINS.has(domain)) {
      return { outcome: "provider", domain };
    }
    const [root, dmarc, ...keys] = await Promise.all([
      lookupTxt(domain),
      lookupTxt(`_dmarc.${domain}`),
      ...DKIM_SELECTORS.map((selector) =>
        lookupTxt(`${selector}._domainkey.${domain}`),
      ),
    ]);
    if (root === null || dmarc === null) {
      return { outcome: "unavailable", domain };
    }
    const dkim = DKIM_SELECTORS.find((_, index) => {
      const records = keys[index];
      return records ? hasDkim(records) : false;
    });
    return {
      outcome: "checked",
      domain,
      spf: hasSpf(root),
      dmarc: hasDmarc(dmarc),
      dkim: dkim ?? null,
    };
  },
});
