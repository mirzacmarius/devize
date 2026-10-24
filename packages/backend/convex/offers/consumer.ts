import type { Infer } from "convex/values";
import { invalid } from "../lib/errors";
import type { signatureEvidence } from "./validators";

// A consumer who accepts an Ofertă on its link concludes a distance contract
// (OUG 34/2014): they may withdraw within 14 days of accepting, and the firm
// confirms the contract to them on a durable medium, by email. The same
// module keeps what is recorded about the signing itself.

export type SignatureEvidence = Infer<typeof signatureEvidence>;

export const WITHDRAWAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60_000;

/** The last moment a consumer may withdraw without a reason. */
export function withdrawalDeadline(signedAt: number): number {
  return signedAt + WITHDRAWAL_DAYS * DAY_MS;
}

const evidenceLimits: Record<keyof SignatureEvidence, number> = {
  userAgent: 300,
  language: 35,
  timeZone: 64,
  screen: 32,
  address: 64,
};

/** The browser's evidence, trimmed to its size; an empty value is left out. */
export function cleanEvidence(
  evidence: SignatureEvidence | undefined,
): SignatureEvidence | undefined {
  if (!evidence) {
    return undefined;
  }
  const clean: SignatureEvidence = {};
  for (const key of Object.keys(
    evidenceLimits,
  ) as (keyof SignatureEvidence)[]) {
    const value = evidence[key]?.trim();
    if (value) {
      if (value.length > evidenceLimits[key]) {
        throw invalid("evidence");
      }
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

/** An email address with most of its name hidden: i***@exemplu.ro. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) {
    return "***";
  }
  return `${email[0]}***${email.slice(at)}`;
}

/**
 * Romania's offset from UTC at a moment, in minutes: EET, or EEST from the
 * last Sunday of March at 01:00 UTC to the last Sunday of October at 01:00
 * UTC. Written out because the runtime may lack the time zone data.
 */
export function bucharestOffsetMinutes(at: number): number {
  const year = new Date(at).getUTCFullYear();
  const lastSunday = (month: number) => {
    const last = new Date(Date.UTC(year, month + 1, 0, 1));
    return last.getTime() - last.getUTCDay() * DAY_MS;
  };
  return at >= lastSunday(2) && at < lastSunday(9) ? 180 : 120;
}

/** A moment as Romania reads it, 24.10.2026, 14:05, without Intl. */
export function formatBucharest(at: number): { date: string; time: string } {
  const local = new Date(at + bucharestOffsetMinutes(at) * 60_000);
  const two = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${two(local.getUTCDate())}.${two(local.getUTCMonth() + 1)}.${local.getUTCFullYear()}`,
    time: `${two(local.getUTCHours())}:${two(local.getUTCMinutes())}`,
  };
}
