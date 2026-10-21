import { useSyncExternalStore } from "react";

const noChanges = () => () => {};

/** The site the firm is using, such as https://devize.ro; empty on the server. */
export function useOrigin(): string {
  return useSyncExternalStore(
    noChanges,
    () => window.location.origin,
    () => "",
  );
}

/** The address of an Ofertă's link on a site. */
export function offerUrl(origin: string, token: string): string {
  return `${origin}/o/${token}`;
}

/** Copies text to the clipboard; false where the browser doesn't allow it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * A phone number as WhatsApp's links want it: digits with the country code,
 * Romanian by default (0722 123 456 is 40722123456). Undefined for anything
 * that isn't a phone number.
 */
export function whatsappNumber(phone: string | undefined): string | undefined {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  let number = digits.replace(/^\+/, "").replace(/^00/, "");
  if (/^0\d{9}$/.test(digits)) {
    number = `40${digits.slice(1)}`;
  }
  return /^\d{10,15}$/.test(number) ? number : undefined;
}
